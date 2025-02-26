import { useEffect, useState } from 'react';
import { MantineProvider, Container, Paper, Title, Grid, Text } from '@mantine/core';
import { io } from 'socket.io-client';

const socket = io('http://localhost:7001');

interface RegisterValues {
  VR: number;
  P: number;
  Q: number;
  PF: number;
  VS: number;
  VT: number;
  F: number;
  IR: number;
  IS: number;
  IT: number;
}

const coilLabels = ['CB', 'LOCAL', 'OCR', 'GFT', 'RACK IN', 'RACK OUT'];

function App() {
  const [registers, setRegisters] = useState<RegisterValues>({
    VR: 0, P: 0, Q: 0, PF: 0, VS: 0, VT: 0, F: 0, IR: 0, IS: 0, IT: 0
  });
  const [coils, setCoils] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    socket.on('register_update', (data: RegisterValues) => {
      setRegisters(data);
    });

    socket.on('coil_update', (data: { values: number[] }) => {
      setCoils(data.values);
    });

    return () => {
      socket.off('register_update');
      socket.off('coil_update');
    };
  }, []);

  return (
    <MantineProvider>
      <Container size="lg" py="xl">
        <Title order={1} mb="xl">Modbus TCP Server Simulator</Title>

        <Grid>
          <Grid.Col span={6}>
            <Paper shadow="sm" p="md">
              <Title order={2} mb="md">Holding Registers</Title>
              {Object.entries(registers).map(([key, value]) => (
                <Text key={key}>
                  {key}: {value}
                </Text>
              ))}
            </Paper>
          </Grid.Col>

          <Grid.Col span={6}>
            <Paper shadow="sm" p="md">
              <Title order={2} mb="md">Coil Status</Title>
              {coilLabels.map((label, index) => (
                <Text key={index}>
                  {label}: {coils[index] ? 'ON' : 'OFF'}
                </Text>
              ))}
            </Paper>
          </Grid.Col>
        </Grid>
      </Container>
    </MantineProvider>
  );
}

export default App;