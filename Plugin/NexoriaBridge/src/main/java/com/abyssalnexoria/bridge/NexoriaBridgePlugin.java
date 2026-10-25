package com.abyssalnexoria.bridge;

import io.papermc.paper.event.player.AsyncChatEvent;
import org.bukkit.BanList;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Date;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class NexoriaBridgePlugin extends JavaPlugin implements Listener {
    private HttpClient http;
    private String apiUrl;
    private String bridgeKey;
    private long muteMillis;
    private static final Pattern ACTION = Pattern.compile("\\{\\\"id\\\":\\\"([^\\\"]+)\\\".*?\\\"minecraftUuid\\\":(null|\\\"[^\\\"]+\\\").*?\\\"nick\\\":\\\"([^\\\"]+)\\\".*?\\\"type\\\":\\\"([^\\\"]+)\\\".*?\\\"reason\\\":\\\"((?:\\\\.|[^\\\"])*)\\\"", Pattern.DOTALL);

    @Override public void onEnable() {
        saveDefaultConfig();
        apiUrl = getConfig().getString("api-url", "").replaceAll("/$", "");
        bridgeKey = getConfig().getString("bridge-key", "");
        muteMillis = getConfig().getLong("default-mute-hours", 24) * 3_600_000L;
        http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(getConfig().getInt("connect-timeout-seconds", 8))).build();
        Bukkit.getPluginManager().registerEvents(this, this);
        reportIntegration("Vault", "economia");
        reportIntegration("LuckPerms", "cargo/VIP");
        reportIntegration("CMI", "homes");
        reportIntegration("GriefPrevention", "claims");
        if (apiUrl.isBlank() || bridgeKey.isBlank()) getLogger().warning("Bridge desconfigurada: configure api-url e bridge-key.");
        long syncTicks = Math.max(20L, getConfig().getLong("sync-interval-seconds", 60) * 20L);
        long pollTicks = Math.max(20L, getConfig().getLong("action-poll-seconds", 10) * 20L);
        Bukkit.getScheduler().runTaskTimerAsynchronously(this, this::syncAllOnline, 40L, syncTicks);
        Bukkit.getScheduler().runTaskTimerAsynchronously(this, this::pollActions, 60L, pollTicks);
    }

    @Override public void onDisable() { for (Player player : Bukkit.getOnlinePlayers()) sync(player, false); }
    @EventHandler public void onJoin(PlayerJoinEvent event) { sync(event.getPlayer(), true); }
    @EventHandler public void onQuit(PlayerQuitEvent event) { sync(event.getPlayer(), false); }
    @EventHandler public void onChat(AsyncChatEvent event) {
        long until = getConfig().getLong("mutes." + event.getPlayer().getUniqueId(), 0L);
        if (until > System.currentTimeMillis()) { event.setCancelled(true); event.getPlayer().sendMessage(color("&cVocê está silenciado até " + new Date(until) + ".")); }
    }

    private void syncAllOnline() { for (Player player : Bukkit.getOnlinePlayers()) sync(player, true); }
    private void sync(Player player, boolean online) {
        if (!configured()) return;
        Location location = player.getLocation();
        String timestamp = java.time.Instant.now().toString();
        double money = vaultBalance(player);
        String vip = luckPermsGroup(player.getUniqueId());
        String homes = cmiHomes(player);
        String payload = "{\"uuid\":\"" + player.getUniqueId() + "\",\"nick\":\"" + esc(player.getName()) + "\",\"online\":" + online + ",\"lastLoginAt\":" + (online ? "\"" + timestamp + "\"" : "null") + ",\"lastLogoutAt\":" + (!online ? "\"" + timestamp + "\"" : "null") + ",\"lastLocation\":{\"world\":\"" + esc(location.getWorld().getName()) + "\",\"x\":" + location.getBlockX() + ",\"y\":" + location.getBlockY() + ",\"z\":" + location.getBlockZ() + "},\"level\":" + player.getLevel() + ",\"experience\":" + Math.round(player.getExp() * player.getExpToLevel()) + ",\"experienceNextLevel\":" + player.getExpToLevel() + ",\"money\":" + money + ",\"vip\":" + (vip == null ? "null" : "\"" + esc(vip) + "\"") + ",\"homes\":" + homes + ",\"inventory\":" + inventory(player) + "}";
        post("/api/plugin/bridge/sync", payload, null);
    }
    private String inventory(Player player) {
        StringBuilder out = new StringBuilder("[");
        for (int slot = 0; slot < player.getInventory().getSize(); slot++) {
            var item = player.getInventory().getItem(slot);
            if (item == null || item.getType() == Material.AIR) continue;
            if (out.length() > 1) out.append(',');
            String type = item.getType().name().toLowerCase().replace('_', '-');
            out.append("{\"slot\":").append(slot).append(",\"type\":\"").append(type).append("\",\"name\":\"").append(esc(item.getType().translationKey())).append("\",\"amount\":").append(item.getAmount()).append('}');
        }
        return out.append(']').toString();
    }
    private double vaultBalance(Player player) {
        if (!getConfig().getBoolean("integrations.vault-economy", true) || Bukkit.getPluginManager().getPlugin("Vault") == null) return 0D;
        try {
            Class<?> economyClass = Class.forName("net.milkbowl.vault.economy.Economy");
            var registration = Bukkit.getServicesManager().getRegistration(economyClass);
            if (registration == null) return 0D;
            Object provider = registration.getProvider();
            return ((Number) economyClass.getMethod("getBalance", org.bukkit.OfflinePlayer.class).invoke(provider, player)).doubleValue();
        } catch (ReflectiveOperationException ignored) { return 0D; }
    }
    private String luckPermsGroup(UUID uuid) {
        if (!getConfig().getBoolean("integrations.luckperms-primary-group", true) || Bukkit.getPluginManager().getPlugin("LuckPerms") == null) return null;
        try {
            Class<?> apiClass = Class.forName("net.luckperms.api.LuckPerms");
            var registration = Bukkit.getServicesManager().getRegistration(apiClass);
            if (registration == null) return null;
            Object manager = apiClass.getMethod("getUserManager").invoke(registration.getProvider());
            Object user = manager.getClass().getMethod("getUser", UUID.class).invoke(manager, uuid);
            return user == null ? null : String.valueOf(user.getClass().getMethod("getPrimaryGroup").invoke(user));
        } catch (ReflectiveOperationException ignored) { return null; }
    }
    private String cmiHomes(Player player) {
        // A API pública do CMI varia por versão. O conector permanece seguro e
        // retorna vazio até a versão instalada expor a consulta de homes.
        if (!getConfig().getBoolean("integrations.cmi-homes", true) || Bukkit.getPluginManager().getPlugin("CMI") == null) return "[]";
        return "[]";
    }
    private void reportIntegration(String plugin, String feature) {
        getLogger().info(plugin + (Bukkit.getPluginManager().getPlugin(plugin) == null ? " não encontrado; " : " detectado; ") + feature + ".");
    }
    private void pollActions() {
        if (!configured()) return;
        HttpRequest request = base("/api/plugin/bridge/actions").GET().build();
        http.sendAsync(request, HttpResponse.BodyHandlers.ofString()).whenComplete((response, error) -> {
            if (error != null || response.statusCode() != 200) { if (error != null) getLogger().warning("Falha ao consultar ações administrativas: " + error.getMessage()); return; }
            Matcher matcher = ACTION.matcher(response.body());
            while (matcher.find()) {
                String id = matcher.group(1), nick = matcher.group(3), type = matcher.group(4), reason = unescape(matcher.group(5));
                Bukkit.getScheduler().runTask(this, () -> executeAction(id, nick, type, reason));
            }
        });
    }
    private void executeAction(String id, String nick, String type, String reason) {
        Player player = Bukkit.getPlayerExact(nick);
        boolean executed = switch (type) {
            case "kick" -> { if (player != null) player.kickPlayer(reason.isBlank() ? "Removido pela administração." : reason); yield player != null; }
            case "ban" -> { Bukkit.getBanList(BanList.Type.NAME).addBan(nick, reason.isBlank() ? "Banido pela administração." : reason, null, "NexoriaAdmin"); if (player != null) player.kickPlayer(reason.isBlank() ? "Banido pela administração." : reason); yield true; }
            case "mute" -> { if (player != null) { getConfig().set("mutes." + player.getUniqueId(), System.currentTimeMillis() + muteMillis); saveConfig(); player.sendMessage(color("&cVocê foi silenciado pela administração.")); yield true; } yield false; }
            case "warn" -> { if (player != null) player.sendMessage(color("&eAviso administrativo: &f" + (reason.isBlank() ? "Respeite as regras." : reason))); yield true; }
            default -> false;
        };
        post("/api/plugin/bridge/actions/" + id + "/complete", "{\"result\":\"" + (executed ? "executed" : "failed") + "\"}", null);
    }
    private void post(String path, String body, Runnable callback) {
        try { http.sendAsync(base(path).POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.discarding()).whenComplete((r, e) -> { if (e != null) getLogger().warning("Falha ao comunicar com API: " + e.getMessage()); if (callback != null) callback.run(); }); }
        catch (Exception error) { getLogger().warning("URL da API inválida: " + error.getMessage()); }
    }
    private HttpRequest.Builder base(String path) { return HttpRequest.newBuilder(URI.create(apiUrl + path)).timeout(Duration.ofSeconds(12)).header("Content-Type", "application/json").header("X-Nexoria-Bridge-Key", bridgeKey); }
    private boolean configured() { return !apiUrl.isBlank() && !bridgeKey.isBlank(); }
    private String esc(String value) { return value.replace("\\", "\\\\").replace("\"", "\\\""); }
    private String unescape(String value) { return value.replace("\\\"", "\"").replace("\\\\", "\\"); }
    private String color(String value) { return ChatColor.translateAlternateColorCodes('&', value); }
}
