import type { NatDiagnosis } from '@tabula/sync/network';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkSection } from './NetworkSection';

const diagnoseNetwork = vi.hoisted(() => vi.fn<() => Promise<NatDiagnosis>>());
vi.mock('@tabula/sync/network', () => ({ diagnoseNetwork }));

afterEach(() => {
  cleanup();
  diagnoseNetwork.mockReset();
});

const diagnosis = (natType: NatDiagnosis['natType']): NatDiagnosis => ({
  natType,
  ipv6: false,
  reachableServers: 2,
});

describe('teste de rede', () => {
  it('diz em linguagem simples se a conexão direta deve abrir', async () => {
    const user = userEvent.setup();
    diagnoseNetwork.mockResolvedValueOnce(diagnosis('cone'));
    render(<NetworkSection />);
    await user.click(screen.getByRole('button', { name: 'Testar minha rede' }));
    expect(await screen.findByText('Sua rede conecta direto.')).toBeInTheDocument();

    diagnoseNetwork.mockResolvedValueOnce(diagnosis('simetrico'));
    await user.click(screen.getByRole('button', { name: 'Testar de novo' }));
    expect(await screen.findByText('Sua rede é restritiva.')).toBeInTheDocument();
    expect(screen.getByText(/Comum no 4G/)).toBeInTheDocument();

    diagnoseNetwork.mockResolvedValueOnce(diagnosis('udp-bloqueado'));
    await user.click(screen.getByRole('button', { name: 'Testar de novo' }));
    expect(await screen.findByText('Esta rede bloqueia a conexão direta.')).toBeInTheDocument();
  });

  it('avisa quando o aparelho não consegue fazer o teste', async () => {
    const user = userEvent.setup();
    diagnoseNetwork.mockRejectedValueOnce(new Error('RTCPeerConnection is not defined'));
    render(<NetworkSection />);
    await user.click(screen.getByRole('button', { name: 'Testar minha rede' }));
    expect(await screen.findByText(/Não deu para testar/)).toBeInTheDocument();
  });
});
