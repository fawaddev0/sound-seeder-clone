import * as Network from 'expo-network';
import React, { useEffect, useState } from "react";
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import HostMode from "../components/HostMode";
import SpeakerMode from "../components/SpeakerMode";

type Mode = 'idle' | 'host' | 'speaker';

export default function Index() {
  const [mode, setMode] = useState<Mode>('idle');
  const [ipAddress, setIpAddress] = useState<string>('Loading...');

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const ip = await Network.getIpAddressAsync();
        setIpAddress(ip);
      } catch (error) {
        setIpAddress('Unknown IP');
      }
    };
    fetchIp();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.ipText}>Your IP: {ipAddress}</Text>
        {mode !== 'idle' && (
          <TouchableOpacity onPress={() => setMode('idle')} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.container}>
        {mode === 'idle' && (
          <View style={styles.buttonsContainer}>
            <Text style={styles.mainTitle}>SoundSeeder Clone</Text>
            <TouchableOpacity
              style={[styles.modeButton, styles.hostButton]}
              onPress={() => setMode('host')}
            >
              <Text style={styles.buttonText}>Start as Host</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, styles.speakerButton]}
              onPress={() => setMode('speaker')}
            >
              <Text style={styles.buttonText}>Join as Speaker</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'host' && <HostMode />}
        {mode === 'speaker' && <SpeakerMode />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 25 : 0, // basic padding for android status bar
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    display: 'flex',
  },
  ipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  backButtonText: {
    fontSize: 12,
    color: '#333',
  },
  container: {
    flex: 1,
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 48,
    color: '#333',
  },
  modeButton: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  hostButton: {
    backgroundColor: '#FF9800',
  },
  speakerButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
