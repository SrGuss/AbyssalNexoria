package com.abyssalnexoria.login;

import java.util.UUID;

/** Serviço público para futuros plugins Nexoria consultarem a autenticação atual. */
public interface NexoriaLoginService {
    boolean isAuthenticated(UUID playerId);
}
