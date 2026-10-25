package com.abyssalnexoria.login;

import io.papermc.paper.event.player.AsyncChatEvent;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryDragEvent;
import org.bukkit.event.player.*;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.entity.EntityPickupItemEvent;
import org.bukkit.event.player.PlayerDropItemEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.event.player.PlayerItemConsumeEvent;
import org.bukkit.event.player.PlayerSwapHandItemsEvent;
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

    @Override
    public void onEnable() {
        saveDefaultConfig();
        apiUrl = getConfig().getString("api-url", "").replaceAll("/$", "");
        pluginKey = getConfig().getString("plugin-key", "");
        minimumPasswordLength = getConfig().getInt("minimum-password-length", 10);
        http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(getConfig().getInt("connect-timeout-seconds", 8)))
                .build();

        if (apiUrl.isBlank() || pluginKey.isBlank()) {
            getLogger().warning("API desconfigurada: jogadores não poderão autenticar até configurar config.yml.");
        }
        Bukkit.getPluginManager().registerEvents(this, this);
        Bukkit.getServicesManager().register(NexoriaLoginService.class, this, this, ServicePriority.Normal);
        getLogger().info("NexoriaLogin ativado. Jogadores precisam autenticar; bypass automático está desativado.");
    }

    @Override
    public void onDisable() {
        authenticated.clear();
        checking.clear();
        Bukkit.getServicesManager().unregister(NexoriaLoginService.class, this);
    }

    @Override
    public boolean isAuthenticated(UUID playerId) {
        return authenticated.contains(playerId);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        // Nenhuma permissão de OP libera autenticação automaticamente.
        authenticated.remove(player.getUniqueId());
        checking.remove(player.getUniqueId());
        player.setWalkSpeed(0.0f);
        player.setFlySpeed(0.0f);
        player.sendMessage(color("&d&lAbyssal Nexoria &8» &fAutentique-se para continuar."));
        player.sendMessage(color("&7Use &d/login <senha> &7ou &d/register <senha> <senha>."));
        player.sendMessage(color("&7Sua conta é a mesma utilizada no site."));
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        UUID id = event.getPlayer().getUniqueId();
        authenticated.remove(id);
        checking.remove(id);
        // Não alterar velocidade aqui: o jogador pode ter outra configuração ao sair.
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onMove(PlayerMoveEvent event) {
        if (isAuthenticated(event.getPlayer().getUniqueId()) || event.getTo() == null) return;
        Location from = event.getFrom();
        Location to = event.getTo();
        if (from.getX() != to.getX() || from.getY() != to.getY() || from.getZ() != to.getZ()
                || from.getYaw() != to.getYaw() || from.getPitch() != to.getPitch()) {
            event.setTo(from);
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onChat(AsyncChatEvent event) {
        if (!isAuthenticated(event.getPlayer().getUniqueId())) {
            event.setCancelled(true);
            event.getPlayer().sendMessage(color("&cFaça login antes de conversar."));
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onCommandPreprocess(PlayerCommandPreprocessEvent event) {
        if (isAuthenticated(event.getPlayer().getUniqueId())) return;
        String message = event.getMessage().trim().toLowerCase();
        String command = message.split("\\s+", 2)[0];
        if (!command.equals("/login") && !command.equals("/register")) {
            event.setCancelled(true);
            event.getPlayer().sendMessage(color("&cComando indisponível antes do login."));
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onInteract(PlayerInteractEvent event) {
        if (!isAuthenticated(event.getPlayer().getUniqueId())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onInteractEntity(PlayerInteractEntityEvent event) {
        if (!isAuthenticated(event.getPlayer().getUniqueId())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onBreak(BlockBreakEvent event) {
        if (!isAuthenticated(event.getPlayer().getUniqueId())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onPlace(BlockPlaceEvent event) {
        if (!isAuthenticated(event.getPlayer().getUniqueId())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onDrop(PlayerDropItemEvent event) {
        if (!isAuthenticated(event.getPlayer().getUniqueId())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onPickup(EntityPickupItemEvent event) {
        if (event.getEntity() instanceof Player player && !isAuthenticated(player.getUniqueId())) {
            event.setCancelled(true);
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onInventoryClick(InventoryClickEvent event) {
        if (event.getWhoClicked() instanceof Player player && !isAuthenticated(player.getUniqueId())) {
            event.setCancelled(true);
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onInventoryDrag(InventoryDragEvent event) {
        if (event.getWhoClicked() instanceof Player player && !isAuthenticated(player.getUniqueId())) {
            event.setCancelled(true);
        }
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onSwapHands(PlayerSwapHandItemsEvent event) {
        if (!isAuthenticated(event.getPlayer().getUniqueId())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onConsume(PlayerItemConsumeEvent event) {
        if (!isAuthenticated(event.getPlayer().getUniqueId())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onDamage(EntityDamageEvent event) {
        if (event.getEntity() instanceof Player player && !isAuthenticated(player.getUniqueId())) {
            event.setCancelled(true);
        }
        if (event instanceof EntityDamageByEntityEvent byEntity
                && byEntity.getDamager() instanceof Player player
                && !isAuthenticated(player.getUniqueId())) {
            event.setCancelled(true);
        }
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player player)) {
            sender.sendMessage("Este comando só pode ser usado por um jogador.");
            return true;
        }
        if (isAuthenticated(player.getUniqueId())) {
            player.sendMessage(color("&aVocê já está autenticado."));
            return true;
        }
        if (checking.contains(player.getUniqueId())) {
            player.sendMessage(color("&eAguarde a validação em andamento."));
            return true;
        }

        if (command.getName().equalsIgnoreCase("login")) {
            if (args.length != 1) {
                player.sendMessage(color("&cUso: /login <senha>"));
                return true;
            }
            verify(player, args[0]);
            return true;
        }
        if (command.getName().equalsIgnoreCase("register")) {
            if (args.length != 2) {
                player.sendMessage(color("&cUso: /register <senha> <confirmacao>"));
                return true;
            }
            if (!args[0].equals(args[1])) {
                player.sendMessage(color("&cAs senhas não coincidem."));
                return true;
            }
            if (args[0].length() < minimumPasswordLength) {
                player.sendMessage(color("&cUse no mínimo " + minimumPasswordLength + " caracteres."));
                return true;
            }
            register(player, args[0]);
            return true;
        }
        return true;
    }

    private void verify(Player player, String password) {
        request(player, "/api/plugin/login/verify",
                "{\"nick\":\"" + escape(player.getName()) + "\",\"password\":\"" + escape(password) + "\"}", false);
    }

    private void register(Player player, String password) {
        request(player, "/api/plugin/login/register",
                "{\"nick\":\"" + escape(player.getName()) + "\",\"uuid\":\"" + player.getUniqueId()
                        + "\",\"password\":\"" + escape(password) + "\"}", true);
    }

    private void request(Player player, String path, String payload, boolean registering) {
        if (apiUrl.isBlank() || pluginKey.isBlank()) {
            player.sendMessage(color("&cSistema de login indisponível. Avise a administração."));
            return;
        }
        UUID id = player.getUniqueId();
        checking.add(id);
        HttpRequest request = HttpRequest.newBuilder(URI.create(apiUrl + path))
                .timeout(Duration.ofSeconds(12))
                .header("Content-Type", "application/json")
                .header("X-Nexoria-Plugin-Key", pluginKey)
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();

        http.sendAsync(request, HttpResponse.BodyHandlers.ofString()).whenComplete((response, error) ->
                Bukkit.getScheduler().runTask(this, () -> {
                    checking.remove(id);
                    if (!player.isOnline()) return;
                    if (error != null) {
                        getLogger().warning("Falha ao consultar API: " + error.getMessage());
                        player.sendMessage(color("&cNão foi possível validar sua conta. Tente novamente."));
                        return;
                    }
                    if (response.statusCode() >= 200 && response.statusCode() < 300) {
                        authenticated.add(id);
                        player.setWalkSpeed(0.2f);
                        player.setFlySpeed(0.1f);
                        player.sendMessage(color(registering
                                ? "&aConta criada e autenticada!" : "&aLogin realizado com sucesso!"));
                    } else if (response.statusCode() == 409) {
                        player.sendMessage(color("&eEsta conta já existe. Use /login."));
                    } else if (response.statusCode() == 401) {
                        player.sendMessage(color("&cSenha incorreta."));
                    } else {
                        getLogger().warning("API de login retornou HTTP " + response.statusCode() + ".");
                        player.sendMessage(color("&cNão foi possível concluir a solicitação. Tente novamente."));
                    }
                }));
    }

    private String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String color(String value) {
        return ChatColor.translateAlternateColorCodes('&', value);
    }
}
