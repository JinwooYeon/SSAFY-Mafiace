package com.ssafy.mafiace.api.service;

import com.ssafy.mafiace.api.request.SessionOpenReq;
import com.ssafy.mafiace.common.model.NewSessionInfo;
import com.ssafy.mafiace.db.entity.User;
import java.util.List;

public interface SessionService {

    NewSessionInfo openSession(String ownerId, SessionOpenReq sessionOpenReq) throws Exception;
    String getToken(String sessionName, String userId) throws Exception;
    void closeSession(String sessionName) throws Exception;
    boolean leaveSession(String sessionName, String request);
    boolean toggleReady(String sessionName, String userId);
    int getParticipantCount(String sessionName);
    boolean isFull(String sessionName);
    boolean isExist(String sessionName);

    List<User> getParticipantList(String sessionName);
}
