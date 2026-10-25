/**
 * Diagnóstico da rede deste aparelho (só no navegador ou no app instalado: usa WebRTC).
 * Diz se a conexão direta deve funcionar, sem conectar a ninguém.
 */
export { diagnoseNetwork, gatherCandidates, STUN_SERVERS } from './check';
export {
  diagnoseNat,
  NAT_DESCRIPTION,
  type GatheredCandidate,
  type NatDiagnosis,
  type NatType,
} from './nat';
