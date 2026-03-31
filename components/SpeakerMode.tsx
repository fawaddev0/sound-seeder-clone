import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TcpSocket from "react-native-tcp-socket";

export default function SpeakerMode() {
  const [hostIp, setHostIp] = useState('');
  const [port, setPort] = useState('8080');
  const [status, setStatus] = useState('Disconnected');
  const [socket, setSocket] = useState<TcpSocket.Socket | null>(null);

  const connectToHost = () => {
    if (!hostIp) {
      alert('Please enter a valid Host IP address.');
      return;
    }

    if (socket) {
      return;
    }

    setStatus('Connecting...');

    const client = TcpSocket.createConnection({ host: hostIp, port: 8080 }, () => {
      setStatus("Connected")

      // Write on the socket
      // client.write('Hello server!');

      // Close socket
      // client.destroy();
    });

    client.on('data', function (data) {
      console.log('message was received', data);
    });

    client.on('error', function (error) {
      console.log(error);
    });

    client.on('close', function () {
      console.log('Connection closed!');
    });

    setSocket(client);
  };

  const disconnect = () => {
    if (socket) {
      socket.destroy();
      setSocket(null);
    }
    setStatus('Disconnected');
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.destroy();
      }
    };
  }, [socket]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Speaker Mode</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Host IP Address:</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 192.168.1.100"
          value={hostIp}
          onChangeText={setHostIp}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Port:</Text>
        <TextInput
          style={styles.input}
          placeholder="8080"
          value={port}
          onChangeText={setPort}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Connection Status: </Text>
        <Text style={[
          styles.statusValue,
          status === 'Connected' ? styles.statusConnected :
            status.startsWith('Error') ? styles.statusError :
              styles.statusDisconnected
        ]}>
          {status}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={connectToHost}>
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={disconnect}>
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#333',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusConnected: {
    color: '#4CAF50',
  },
  statusDisconnected: {
    color: '#757575',
  },
  statusError: {
    color: '#F44336',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
