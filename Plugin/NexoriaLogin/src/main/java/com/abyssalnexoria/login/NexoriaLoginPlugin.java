package com.abyssalnexoria.login;

import io.papermc.paper.event.player.AsyncChatEvent;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerCommandPreprocessEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.ServicePriority;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public final class NexoriaLoginPlugin extends JavaPlugin implements Listener, NexoriaLoginService {
    private final Set<UUID> authenticated = ConcurrentHashMap.newKeySet();
    private final Set<UUID> checking = ConcurrentHashMap.newKeySet();
    private HttpClient http;
    private String apiUrl;
    private String pluginKey;
    private int minimumPasswordLength;

    @Override public void onEnable() {
        saveDefaultConfig();
        apiUrl = getConfig().getString("api-url", "").replaceAll("/$", "");
        pluginKey = getConfig().getString("plugin-key", "");
        minimumPasswordLength = getConfig().getInt("minimum-password-length", 10);
        http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(getConfig().getInt("connect-timeout-seconds", 8))).build();
        if (apiUrl.isBlank() || pluginKey.isBlank()) getLogger().warning("API desconfigurada: jogadores não poderão autenticar até configurar config.yml.");
        Bukkit.getPluginManager().registerEvents(this, this);
        Bukkit.getServicesManager().register(NexoriaLoginService.class, this, this, ServicePriority.Normal);
    }
    @Override public void onDisable() { authenticated.clear(); checking.clear(); Bukkit.getServicesManager().unregister(NexoriaLoginService.class, this); }
    @Override public boolean isAuthenticated(UUID playerId) { return authenticated.contains(playerId); }

    @EventHandler public void onJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        if (player.hasPermission("nexoria.login.bypass")) { authenticated.add(player.getUniqueId()); return; }
        player.sendMessage(color("&d&lNexoria &8» &fUse &d/login <senha> &fou &d/register <senha> <senha>."));
        player.sendMessage(color("&7Sua conta é a mesma utilizada no site."));
    }
    @EventHandler public void onQuit(PlayerQuitEvent event) { authenticated.remove(event.getPlayer().getUniqueId()); checking.remove(event.getPlayer().getUniqueId()); }
    @EventHandler public void onChat(AsyncChatEvent event) { if (!isAuthenticated(event.getPlayer().getUniqueId())) { event.setCancelled(true); event.getPlayer().sendMessage(color("&cFaça login antes de conversar.")); } }
    @EventHandler public void onMove(PlayerMoveEvent event) { if (!isAuthenticated(event.getPlayer().getUniqueId()) && changedBlock(event.getFrom(), event.getTo())) event.setTo(event.getFrom()); }
    @EventHandler public void onCommand(PlayerCommandPreprocessEvent event) {
        if (isAuthenticated(event.getPlayer().getUniqueId())) return;
        String command = event.getMessage().toLowerCase().split(" ")[0];
        if (!command.equals("/login") && !command.equals("/register")) { event.setCancelled(true); event.getPlayer().sendMessage(color("&cComando indisponível antes do login.")); }
    }
    private boolean changedBlock(Location from, Location to) { return to != null && (from.getBlockX()!=to.getBlockX() || from.getBlockY()!=to.getBlockY() || from.getBlockZ()!=to.getBlockZ()); }

    @Override public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player player)) return true;
        if (isAuthenticated(player.getUniqueId())) { player.sendMessage(color("&aVocê já está autenticado.")); return true; }
        if (checking.contains(player.getUniqueId())) { player.sendMessage(color("&eAguarde a validação em andamento.")); return true; }
        if (command.getName().equalsIgnoreCase("login")) { if (args.length != 1) return false; verify(player, args[0]); return true; }
        if (args.length != 2) return false;
        if (!args[0].equals(args[1])) { player.sendMessage(color("&cAs senhas não coincidem.")); return true; }
        if (args[0].length() < minimumPasswordLength) { player.sendMessage(color("&cUse no mínimo " + minimumPasswordLength + " caracteres.")); return true; }
        register(player, args[0]); return true;
    }
    private void verify(Player player, String password) { request(player, "/api/plugin/login/verify", "{\"nick\":\"" + escape(player.getName()) + "\",\"password\":\"" + escape(password) + "\"}", false); }
    private void register(Player player, String password) { request(player, "/api/plugin/login/register", "{\"nick\":\"" + escape(player.getName()) + "\",\"uuid\":\"" + player.getUniqueId() + "\",\"password\":\"" + escape(password) + "\"}", true); }
    private void request(Player player, String path, String payload, boolean registering) {
        if (apiUrl.isBlank() || pluginKey.isBlank()) { player.sendMessage(color("&cSistema de login temporariamente indisponível.")); return; }
        checking.add(player.getUniqueId());
        HttpRequest request = HttpRequest.newBuilder(URI.create(apiUrl + path)).timeout(Duration.ofSeconds(12)).header("Content-Type", "application/json").header("X-Nexoria-Plugin-Key", pluginKey).POST(HttpRequest.BodyPublishers.ofString(payload)).build();
        http.sendAsync(request, HttpResponse.BodyHandlers.ofString()).whenComplete((response, error) -> Bukkit.getScheduler().runTask(this, () -> {
            checking.remove(player.getUniqueId()); if (!player.isOnline()) return;
            if (error != null) { getLogger().warning("Falha ao consultar API: " + error.getMessage()); player.sendMessage(color("&cNão foi possível validar sua conta. Tente novamente.")); return; }
            if (response.statusCode() >= 200 && response.statusCode() < 300) { authenticated.add(player.getUniqueId()); player.sendMessage(color(registering ? "&aConta criada e autenticada!" : "&aLogin realizado com sucesso!")); }
            else if (response.statusCode() == 409) player.sendMessage(color("&eEsta conta já existe. Use /login."));
            else if (response.statusCode() == 401) player.sendMessage(color("&cSenha incorreta."));
            else player.sendMessage(color("&cNão foi possível concluir a solicitação. Tente novamente."));
        }));
    }
    private String escape(String value) { return value.replace("\\", "\\\\").replace("\"", "\\\""); }
    private String color(String value) { return ChatColor.translateAlternateColorCodes('&', value); }
}
