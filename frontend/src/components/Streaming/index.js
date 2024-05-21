import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'peerjs';

const SOCKET_SERVER_URL = process.env.NODE_ENV === "production" ? "https://rodel.onrender.com" : "http://localhost:8000";
const socket = io(SOCKET_SERVER_URL);

const Streaming = () => {
    const [socket] = useState(() => io.connect('/'));
    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const pcRef = useRef(new RTCPeerConnection());

    useEffect(() => {
        const pc = pcRef.current;

        socket.on('offer', async ({ sdp, sender }) => {
            if (pc.signalingState !== 'stable') return;
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer', { sdp: pc.localDescription, target: sender });
        });

        socket.on('answer', async ({ sdp }) => {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on('ice-candidate', ({ candidate }) => {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { candidate: event.candidate, target: remoteSocketId });
            }
        };

        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
            });

        return () => {
            pc.close();
            socket.disconnect();
        };
    }, [socket]);

    const callPeer = async () => {
        const pc = pcRef.current;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { sdp: pc.localDescription, target: remoteSocketId });
    };

    const [remoteSocketId, setRemoteSocketId] = useState('');

    return (
        <div>
            <h1>WebRTC Video Chat</h1>
            <input
                type="text"
                placeholder="Remote socket ID"
                value={remoteSocketId}
                onChange={(e) => setRemoteSocketId(e.target.value)}
            />
            <button onClick={callPeer}>Call</button>
            <div>
                <video ref={localVideoRef} autoPlay muted style={{ width: '300px' }}></video>
                <video ref={remoteVideoRef} autoPlay style={{ width: '300px' }}></video>
            </div>
        </div>
    );
};

export default Streaming;
