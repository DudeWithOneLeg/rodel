import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'peerjs';

const SOCKET_SERVER_URL = process.env.NODE_ENV === "production" ? "https://rodel.onrender.com" : "http://localhost:8000";
//const socket = io(SOCKET_SERVER_URL);

const Streaming = ({socket}) => {
    const [peerId, setPeerId] = useState(null);
    const [targetPeerId, setTargetPeerId] = useState('python-sender');
    const [conn, setConn] = useState(null);
    const videoRef = useRef(null);


    useEffect(() => {
        const peer = new Peer('react-receiver');

        peer.on('open', (id) => {
            setPeerId(id);
            console.log('My peer ID is:', id);
            socket.emit('register', id);
        });

        peer.on('connection', (connection) => {
            setConn(connection);
            connection.on('data', (data) => {
                console.log('Received:', data);
            });
        });

        peer.on('call', (call) => {
            call.answer();
            call.on('stream', (remoteStream) => {
                videoRef.current.srcObject = remoteStream;
            });
        });

        socket.on('signal', async ({ peerId: senderId, payload }) => {
            if (payload.type === 'offer') {
                const call = peer.call(senderId, new MediaStream());
                call.on('stream', (remoteStream) => {
                    videoRef.current.srcObject = remoteStream;
                });
                await peer._connections[senderId][0].peerConnection.setRemoteDescription(payload);
            } else if (payload.type === 'ice') {
                await peer._connections[senderId][0].peerConnection.addIceCandidate(payload);
            }
        });
        return () => {
            pc.close();
            socket.disconnect();
        };
    }, [socket, remoteSocketId]);

    const callPeer = async () => {
        const pc = pcRef.current;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { sdp: pc.localDescription, target: remoteSocketId });
    };

return () => {
            peer.destroy();
            socket.close();
        };
    }, [socket]);

    return (
        <div>
            
            <div>
                <video ref={videoref} autoPlay muted style={{ width: '300px'}></video>
            </div>
        </div>
    );
};

export default Streaming;
