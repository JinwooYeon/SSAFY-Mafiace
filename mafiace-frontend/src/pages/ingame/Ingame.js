import { useEffect, useState, useRef } from "react";
import { OpenVidu } from "openvidu-browser";
import SockJsClient from "react-stomp";
import HeaderIngameCompo from "../../components/ingame/headerIngame/HeaderIngameCompo";
import Loader from "../../components/common/Loader";
import UserVideoComponent from "../../components/ingame/ingame/UserVideoComponent";
import Day from "../../components/ingame/ingame/Day";
import Night from "../../components/ingame/ingame/Night";

import * as React from "react";
import axios from "axios";
import jwt from "jwt-decode";

const Ingame = ({ setIngame, gameInfo, token, ingame }) => {
  window.onbeforeunload = () => {
    leaveSession();
  };

  let OV = new OpenVidu();

  const [day, setDay] = useState(false);
  const [night, setNight] = useState(false);
  const [nickName, setNickName] = useState("he");
  const [session, setSession] = useState();
  const [mainStreamManager, setMainStreamManager] = useState();
  const [publisher, setPublisher] = useState();
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoding] = useState(true);
  const [topics, setTopics] = useState();
  const [start, setStart] = useState(false);

  const $websocket = useRef(null);

  useEffect(() => {
    // 초기 세팅
    const nickName = jwt(localStorage.getItem("jwt")).nickname;
    setNickName(nickName);
    setTopics([`/topic/${gameInfo.id}`, `/topic/${nickName}`]);
    // --- 2) Init a session ---
    let mySession = OV.initSession();
    setSession(mySession);

    // --- 3) Specify the actions when events take place in the session ---

    // On every new Stream received...
    mySession.on("streamCreated", (event) => {
      // Subscribe to the Stream to receive it. Second parameter is undefined
      // so OpenVidu doesn't create an HTML video by its own
      // let subscriber = mySession.subscribe(event.stream, undefined);
      mySession.subscribeAsync(event.stream, undefined).then((subscriber) => {
        setSubscribers((subs) => [subscriber, ...subs]);
      });
    });

    // On every Stream destroyed...
    mySession.on("streamDestroyed", (event) => {
      // Remove the stream from 'subscribers' array
      deleteSubscriber(event.stream.streamManager);
    });

    // On every asynchronous exception...
    mySession.on("exception", (exception) => {
      console.warn(exception);
    });

    // --- 4) Connect to the session with a valid user token ---

    // 'token' parameter should be retrieved and returned by your own backend
    // First param is the token got from OpenVidu Server. Second param can be retrieved by every user on event
    // 'streamCreated' (property Stream.connection.data), and will be appended to DOM as the user's nickname
    mySession
      .connect(token, { nickName })
      .then(() => {
        // --- 5) Get your own camera stream ---

        // Init a publisher passing undefined as targetElement (we don't want OpenVidu to insert a video
        // element: we will manage it on our own) and with the desired properties
        let publisher = OV.initPublisher(undefined, {
          audioSource: undefined, // The source of audio. If undefined default microphone
          videoSource: undefined, // The source of video. If undefined default webcam
          publishAudio: true, // Whether you want to start publishing with your audio unmuted or not
          publishVideo: true, // Whether you want to start publishing with your video enabled or not
          resolution: "640x480", // The resolution of your video
          frameRate: 30, // The frame rate of your video
          insertMode: "APPEND", // How the video is inserted in the target element 'video-container'
          mirror: false, // Whether to mirror your local video or not
        });

        // --- 6) Publish your stream ---

        mySession.publish(publisher);

        // Set the main video in the page to display our webcam and store our Publisher
        setMainStreamManager(publisher);
        setPublisher(publisher);
        setLoding(false);
        console.log(subscribers);
      })
      .catch((error) => {
        console.log(
          "There was an error connecting to the session:",
          error.code,
          error.message
        );
      });

    return () => {
      window.onbeforeunload();
    };
  }, []);

  const deleteSubscriber = (streamManager) => {
    setSubscribers((subs) => {
      let index = subs.indexOf(streamManager, 0);
      if (index > -1) {
        subs.splice(index, 1);
        return subs;
      }
      return subs;
    });
  };

  const leaveSession = () => {
    // --- 7) Leave the session by calling 'disconnect' method over the Session object ---

    if (publisher && subscribers.length === 0) {
      console.log("방 삭제");
      deleteRoom();
    } else {
      axios.delete("/mafiace/api/session/user", {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
        params: { sessionName: gameInfo.id },
      });
    }

    if (session) {
      session.disconnect();
    }

    // Empty all properties...
    OV = null;
    setSession(undefined);
    setSubscribers([]);
    setMainStreamManager(undefined);
    setPublisher(undefined);
    setIngame(!ingame);
  };

  const handleMainVideoStream = (stream) => {
    if (mainStreamManager !== stream) {
      setMainStreamManager(stream);
    }
  };

  const handleClick = () => {
    console.log("클릭");
    console.log(publisher);
    console.log(subscribers);
    console.log(mainStreamManager);
  };

  const handleStart = () => {
    console.log("====================START======================");
    $websocket.current.sendMessage(`/app/timer/${gameInfo.id}`);
    $websocket.current.sendMessage(`/app/start/${gameInfo.id}`);
  };

  const handleDay = () => {
    setDay((prev) => !prev);
  };

  const handleNight = () => {
    setNight((prev) => !prev);
  };

  const deleteRoom = () => {
    console.log(gameInfo);

    axios.delete("/mafiace/api/session", {
      headers: { Authorization: `Bearer ${localStorage.getItem("jwt")}` },
      params: { sessionName: gameInfo.id },
    });
  };

  return (
    <div>
      {loading ? (
        <Loader />
      ) : (
        <>
          <SockJsClient
            url="http://localhost:8080/mafiace/ws"
            topics={topics}
            onConnect={() => {
              console.log("게임방 소켓 연결");
            }}
            onDisconnect={() => {
              console.log("게임방 소켓 종료");
            }}
            onMessage={(msg) => {
              if (msg === "start") {
                setStart(true);
                console.log(msg);
              }
            }}
            ref={$websocket}
          />

          {day ? <Day></Day> : null}
          {night ? <Night></Night> : null}

          <HeaderIngameCompo gameInfo={gameInfo} start={start} />

          <div
            id="session"
            style={{
              position: "absolute",
              zIndex: "10",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
              width: "100%",
            }}
          >
            <div id="session-header">
              <h1 id="session-title">{nickName}</h1>
              <input
                className="btn btn-large btn-danger"
                type="button"
                id="buttonLeaveSession"
                onClick={leaveSession}
                value="Leave session"
              />
              <button onClick={handleClick}>버튼</button>
              <button onClick={handleStart}>START</button>
              <button onClick={handleDay}>낮 배경 켜기/끄기</button>
              <button onClick={handleNight}>밤 배경 켜기/끄기</button>
            </div>

            <div
              id="video-container"
              className="col-md-6"
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-around",
                width: "100%",
                height: "80%",
              }}
            >
              {publisher !== undefined ? (
                <div
                  className="stream-container col-md-6 col-xs-6"
                  style={{ margin: "1% 1.5%", width: "22%", height: "40%" }}
                  onClick={() => handleMainVideoStream(publisher)}
                >
                  <UserVideoComponent streamManager={publisher} />
                </div>
              ) : null}
              {subscribers.map((sub, i) => (
                <div
                  key={i}
                  className="stream-container col-md-6 col-xs-6"
                  style={{ margin: "1% 1.5%", width: "22%", height: "40%" }}
                  onClick={() => handleMainVideoStream(sub)}
                >
                  <div>
                    <UserVideoComponent streamManager={sub} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Ingame;
