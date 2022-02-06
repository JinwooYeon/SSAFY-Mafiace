package com.ssafy.mafiace.api.controller;

import com.ssafy.mafiace.api.request.SessionOpenReq;
import com.ssafy.mafiace.common.model.NewSessionInfo;
import com.ssafy.mafiace.api.response.SessionTokenPostRes;
import com.ssafy.mafiace.api.service.SessionService;
import com.ssafy.mafiace.common.auth.JwtTokenProvider;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import io.swagger.annotations.ApiResponse;
import io.swagger.annotations.ApiResponses;
import javax.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin("*")
@Api(value = "세션 관리 API", tags = {"SessionController"})
@RestController
@RequestMapping("/api/session")
public class SessionController {

    private SessionService sessionService;
    private JwtTokenProvider jwtTokenProvider;

    public SessionController(SessionService sessionService, JwtTokenProvider jwtTokenProvider) {
        this.sessionService = sessionService;
        this.jwtTokenProvider = jwtTokenProvider;
    }


    @PostMapping("/token")
    @ApiOperation(value = "세션방 생성", notes = "생성된 방 번호의 토큰 제공")
    @ApiResponses({
        @ApiResponse(code = 200, message = "성공"),
        @ApiResponse(code = 500, message = "Server Error"),
    })
    public ResponseEntity<SessionTokenPostRes> openSession(HttpServletRequest request,
        @RequestBody SessionOpenReq sessionOpenReq) {
        String jwtToken = request.getHeader("Authorization").substring(7);
        String id = jwtTokenProvider.getUserPk(jwtToken);

        try {
            NewSessionInfo info = sessionService.openSession(id, sessionOpenReq);
            // Return the response to the client
            return ResponseEntity.status(201)
                .body(SessionTokenPostRes.of(201, "Success", info));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(SessionTokenPostRes.of(500, "Server Error", null));
        }
    }

    @GetMapping("/token")
    @ApiOperation(value = "세션방 토큰 얻기", notes = "해당하는 방 번호의 토큰 제공")
    @ApiResponses({
        @ApiResponse(code = 200, message = "성공"),
        @ApiResponse(code = 404, message = "존재하지 않는 방"),
    })
    public ResponseEntity<SessionTokenPostRes> getToken(
        @ApiParam(value = "세션방 정보(방 번호)", required = true) String sessionName) {

        // Build connectionProperties object with the serverData and the role
        ConnectionProperties connectionProperties = new ConnectionProperties.Builder().type(
            ConnectionType.WEBRTC).build();

        // Session already exists
        System.out.println("Existing session " + sessionName);
        try {
            // Generate a new Connection with the recently created connectionProperties
            String token = sessionService.getToken(sessionName);
            //this.mapSessions.get(sessionName).createConnection(connectionProperties).getToken();

            // Return the response to the client
            return ResponseEntity.status(201)
                .body(
                    SessionTokenPostRes.of(201, "Success", NewSessionInfo.of(token, sessionName)));
        } catch (Exception e) {

            return ResponseEntity.status(404)
                .body(SessionTokenPostRes.of(404, "해당하는 세션방 없음", null));
        }
    }
}
