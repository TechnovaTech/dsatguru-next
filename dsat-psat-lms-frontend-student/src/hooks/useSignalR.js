import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '../context/AuthContext';

export const useSignalR = (hubUrl) => {
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const connectionRef = useRef(null);

  const connect = useCallback(async () => {
    if (connectionRef.current || !token) return;

    try {
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => token,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: retryContext => {
            if (retryContext.elapsedMilliseconds < 60000) {
              return Math.random() * 10000;
            } else {
              return null;
            }
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Connection event handlers
      newConnection.onreconnecting(() => {
        console.log('SignalR: Attempting to reconnect...');
        setIsConnected(false);
        setError(null);
      });

      newConnection.onreconnected(() => {
        console.log('SignalR: Reconnected successfully');
        setIsConnected(true);
        setError(null);
      });

      newConnection.onclose((error) => {
        console.log('SignalR: Connection closed', error);
        setIsConnected(false);
        if (error) {
          setError(error.message || 'Connection lost');
        }
        connectionRef.current = null;
        setConnection(null);
      });

      await newConnection.start();
      
      connectionRef.current = newConnection;
      setConnection(newConnection);
      setIsConnected(true);
      setError(null);
      
      console.log('SignalR: Connected successfully');
    } catch (err) {
      console.error('SignalR connection error:', err);
      setError(err.message || 'Failed to connect');
      setIsConnected(false);
    }
  }, [hubUrl, token]);

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      try {
        await connectionRef.current.stop();
      } catch (err) {
        console.error('Error disconnecting SignalR:', err);
      } finally {
        connectionRef.current = null;
        setConnection(null);
        setIsConnected(false);
      }
    }
  }, []);

  const invoke = useCallback(async (methodName, ...args) => {
    if (connectionRef.current && isConnected) {
      try {
        return await connectionRef.current.invoke(methodName, ...args);
      } catch (err) {
        console.error(`Error invoking ${methodName}:`, err);
        setError(err.message || `Failed to invoke ${methodName}`);
        throw err;
      }
    } else {
      throw new Error('SignalR connection not available');
    }
  }, [isConnected]);

  const on = useCallback((eventName, callback) => {
    if (connectionRef.current) {
      connectionRef.current.on(eventName, callback);
    }
  }, []);

  const off = useCallback((eventName, callback) => {
    if (connectionRef.current) {
      connectionRef.current.off(eventName, callback);
    }
  }, []);

  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  return {
    connection,
    isConnected,
    error,
    connect,
    disconnect,
    invoke,
    on,
    off
  };
};

export const useLiveClassSignalR = () => {
  const hubUrl = `${import.meta.env.VITE_API_URL || 'https://localhost:7001'}/hubs/liveclass`;
  return useSignalR(hubUrl);
};