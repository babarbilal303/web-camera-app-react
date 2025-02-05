import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import Header from "../components/Header";
import "./video.css"; // Import CSS file for styling
import MainLayout from "./MainLayout";
import Footer from "../components/Footer";
import * as tf from "@tensorflow/tfjs";
import * as posenet from "@tensorflow-models/posenet";
import { drawKeypoints, drawSkeleton } from "./../utilities/utility";

function VideoModeScreen() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const videoWrapperRef = useRef(null);
  const [readyToTakePhoto, setReadyToTakePhoto] = useState(false);

  const mediaRecorderRef = useRef(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [resolution, setResolution] = useState({ width: 1280, height: 720 });
  const [selectedFrameRate, setSelectedFrameRate] = useState(30); // Default frame rate
  const [deviceId, setDeviceId] = useState(null);
  const [isPoseDetectionActive, setIsPoseDetectionActive] = useState(false);
  const [poseDetectionInterval, setPoseDetectionInterval] = useState(null);

  const handleResolutionChange = (event) => {
    const selectedResolution = JSON.parse(event.target.value);
    setResolution(selectedResolution);
  };

  const handleFrameRate = (event) => {
    setSelectedFrameRate(event.target.value);
  };

  useEffect(() => {
    const handleResize = () => {
      const { offsetWidth } = videoWrapperRef.current;
      webcamRef.current.video.width = offsetWidth;
      webcamRef.current.video.height =
        (offsetWidth * resolution.height) / resolution.width;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [resolution]);

  const resolutions = [
    { value: { width: 640, height: 480 }, label: "640" },
    { value: { width: 1280, height: 720 }, label: "1280" },
    // Add more resolutions as needed
  ];

  useEffect(() => {
    if (recordedChunks.length > 0 && !isRecording) {
      const recordedBlob = new Blob(recordedChunks, { type: "video/webm" });
      console.log(recordedBlob, "RECORDED BLOB");
      const videoUrl = URL.createObjectURL(recordedBlob);
      setRecordedVideoUrl(videoUrl);
      downloadRecordedVideo();
    }
  }, [recordedChunks, isRecording]);

  const handleStartRecording = () => {
    console.log("START");
    const stream = webcamRef.current.video.srcObject;
    mediaRecorderRef.current = new MediaRecorder(stream);
    mediaRecorderRef.current.ondataavailable = handleDataAvailable;
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setRecordedChunks([]);
  };

  const handleStopRecording = () => {
    console.log("STOOOPP");
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleDataAvailable = (event) => {
    if (event.data.size > 0) {
      console.log("INSIEEEEEE");
      setRecordedChunks((prev) => [...prev, event.data]);
    }
  };

  const downloadRecordedVideo = () => {
    if (recordedVideoUrl) {
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = recordedVideoUrl;
      a.download = "recorded_video.webm";
      a.click();
      window.URL.revokeObjectURL(recordedVideoUrl);
    }
  };

  const retake = () => {
    setRecordedChunks([]);
    setRecordedVideoUrl(null);
    setIsRecording(false);
  };

  const uploadBlob = () => {
    const recordedBlob = new Blob(recordedChunks, { type: "video/webm" });
    console.log(recordedBlob, "Upload BLOB");
  };

  const handleSwitchCamera = () => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      if (videoDevices.length > 1) {
        const nextDeviceId =
          videoDevices.find((device) => device.deviceId !== deviceId)
            ?.deviceId || videoDevices[0].deviceId;
        setDeviceId(nextDeviceId);
      }
    });
  };

  // POSE DETECTION
  //  Load posenet
  useEffect(() => {
    if (isPoseDetectionActive) {
      const intervalId = runPosenet();
      setPoseDetectionInterval(intervalId);
    } else {
      clearInterval(poseDetectionInterval);

  
    }
    clearCanvas();


  }, [isPoseDetectionActive]);

  const runPosenet = () => {
    const intervalId = setInterval(async () => {
      const net = await posenet.load({
        inputResolution: { width: 640, height: 480 },
        scale: 0.8,
      });

      detect(net);
    }, 100);
    
    return intervalId;
  };

  const detect = async (net) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      // Set video width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Make Detections
      const pose = await net.estimateSinglePose(video);
      
      drawCanvas(pose, video, videoWidth, videoHeight, canvasRef);
    }
  };

  const drawCanvas = (pose, video, videoWidth, videoHeight, canvas) => {
    const ctx = canvas.current.getContext("2d");
    canvas.current.width = videoWidth;
    canvas.current.height = videoHeight;

    ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
    console.log(pose["keypoints"])
// console.log(isPoseDetectionActive,"isPoseDetectionActive")
    // if (isPoseDetectionActive) {
      drawKeypoints(pose["keypoints"], 0.6, ctx);
      drawSkeleton(pose["keypoints"], 0.7, ctx);
    // }
  };

  const togglePoseDetection = () => {
    setIsPoseDetectionActive((prevState) => {
      if (!prevState) {
        clearCanvas(); // Clear canvas when turning on pose detection
      }
      return !prevState;
    });  

  };
  const handleWebcamLoaded = () => {
    setReadyToTakePhoto(true);
  };

  const clearCanvas = () => {
    console.log("Clearing canvas...");
    const ctx = canvasRef.current.getContext("2d");
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  };

  return (
    <>
      <MainLayout>
        {!recordedVideoUrl && (
          <div
            ref={videoWrapperRef}
            className="flex flex-col justify-center items-center"
            style={{
              width: "100%",
              height: "80vh",
              backgroundColor: "#000000",
            }}
          >
            <div
              className={
                readyToTakePhoto
                  ? "ready-to-take-photo"
                  : "ready-to-take-photo-danger"
              }
            >
              <p>Ready to take photo</p>
            </div>

            <Webcam
              ref={webcamRef}
              width="100%"
              //   height="auto"
              className="Webcam-view"
              videoConstraints={{
                ...resolution,
                frameRate: selectedFrameRate,
                deviceId: deviceId,
              }}
              onUserMedia={() => handleWebcamLoaded()}
            />
            
            <canvas
              ref={canvasRef}
              style={{
                display: isPoseDetectionActive ? "block" : "none",
                position: "absolute",
                marginLeft: "auto",
                marginRight: "auto",
                left: 0,
                right: 0,
                textAlign: "center",
                zIndex: 9,
                width: 640,
                height: 480,
              }}
            />

            <div className="record-button-view">
              {isRecording ? (
                <button
                  onClick={handleStopRecording}
                  className="record-button"
                  id="recordButton"
                >
                  Stop Recording
                </button>
              ) : (
                <button
                  onClick={handleStartRecording}
                  className="record-button"
                  id="recordButton"
                >
                  Start Recording
                </button>
              )}
            </div>
          </div>
        )}
        {recordedVideoUrl && (
          <div
            className="webcam-container"
            style={{ backgroundColor: "#000000" }}
          >
            <video
              controls
              // style={{  width: "50%" ,
              // height: "auto" }}
              // className="render-video"
              style={{ width: "50%", height: "auto", maxWidth: "100%" }}
              src={recordedVideoUrl}
            />

            <div className="record-button-view flex flex-row justify-center items-center">
              <button
                onClick={() => retake()}
                className="record-button mr-5"
                id="recordButton"
              >
                Retake
              </button>

              <button
                onClick={uploadBlob}
                className="record-button"
                id="recordButton"
              >
                Upload
              </button>
            </div>
      
          </div>
        )}
        <Footer
          resolutions={resolutions}
          onChangeResolution={handleResolutionChange}
          onChangeFrameRate={handleFrameRate}
          selectedFrameRate={selectedFrameRate}
          selectedResolution={JSON.stringify(resolution)}
          handleSwitchCamera={handleSwitchCamera}
          mode="Video"
          togglePoseDetection={togglePoseDetection}
        />
      </MainLayout>
    </>
  );
}

export default VideoModeScreen;
