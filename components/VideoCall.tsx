"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { useJoin, useLocalMicrophoneTrack, useLocalCameraTrack, usePublish, useRemoteUsers } from "agora-rtc-react"
import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react"
import { LocalUser, RemoteUser } from "agora-rtc-react"

type VideoCallProps = {
  appId: string
  channel: string
  token?: string
}

const VideoCallComponent = ({ appId, channel, token }: VideoCallProps) => {
  console.log("channel", channel)
  const [callStarted, setCallStarted] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)

  const handleStartCall = () => {
    setCallStarted(true)
  }

  const joinResult = useJoin({ appid: appId, channel, token: token || null }, callStarted)
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn && callStarted)
  const { localCameraTrack } = useLocalCameraTrack(cameraOn && callStarted)

  const toggleMic = useCallback(() => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setEnabled(!micOn)
      setMicOn((prev) => !prev)
    }
  }, [localMicrophoneTrack, micOn])

  const toggleCamera = useCallback(() => {
    if (localCameraTrack) {
      localCameraTrack.setEnabled(!cameraOn)
      setCameraOn((prev) => !prev)
    }
  }, [localCameraTrack, cameraOn])

  usePublish([localMicrophoneTrack, localCameraTrack])
  const remoteUsers = useRemoteUsers()

  if (!callStarted) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button onClick={handleStartCall} className="bg-black text-white hover:bg-black/90">
          Join Video Call
        </Button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-lg ${isMinimized ? "w-64" : "w-80"}`}>
      <div className="p-2 border-b flex justify-between items-center">
        <h3 className="text-sm font-medium">Live Session</h3>
        <Button variant="ghost" size="sm" onClick={() => setIsMinimized(!isMinimized)}>
          <ChevronRight className={`h-4 w-4 ${isMinimized ? "" : "rotate-90"}`} />
        </Button>
      </div>
      <div className={isMinimized ? "h-36" : "h-48"}>
        <div className="grid grid-cols-2 gap-1 p-1 h-full">
          <div className="relative aspect-video bg-gray-100 rounded">
            <LocalUser
              audioTrack={localMicrophoneTrack}
              videoTrack={localCameraTrack}
              micOn={micOn}
              cameraOn={cameraOn}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "0.25rem" }}
            />
            <div className="absolute bottom-1 right-1 flex gap-1 z-10">
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 ${micOn ? "bg-black/50 hover:bg-black/70" : "bg-red-500/50 hover:bg-red-500/70"} text-white`}
                onClick={toggleMic}
              >
                {micOn ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </svg>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 ${cameraOn ? "bg-black/50 hover:bg-black/70" : "bg-red-500/50 hover:bg-red-500/70"} text-white`}
                onClick={toggleCamera}
              >
                {cameraOn ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </svg>
                )}
              </Button>
            </div>
          </div>
          {remoteUsers.map((user) => (
            <div key={user.uid} className="relative aspect-video bg-gray-100 rounded overflow-hidden">
              <RemoteUser
                user={user}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "0.25rem" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function VideoCall({ appId, channel, token }: VideoCallProps) {
  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
  return (
    <AgoraRTCProvider client={client}>
      <VideoCallComponent appId={appId} channel={channel} token={token} />
    </AgoraRTCProvider>
  )
}
