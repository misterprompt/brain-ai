import { useEffect, useState } from 'react';
import './WinProbabilityBar.css';
import { apiClient } from '../../api/client';

type WinProbabilityBarProps = {
  gameId: string | number | null;
};

type EvaluationPayload = {
  success?: boolean;
  data?: {
    evaluation?: {
      equity?: number;
      pr?: number;
      winrate?: number;
    } | null;
  } | null;
};

export function WinProbabilityBar({ gameId }: WinProbabilityBarProps) {
  const [whiteProb, setWhiteProb] = useState<number | null>(null);
  const [blackProb, setBlackProb] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setWhiteProb(null);
      setBlackProb(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const fetchEvaluation = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.evaluatePosition<EvaluationPayload>(gameId, undefined, {
          signal: controller.signal
        });

        if (cancelled) {
          return;
        }

        const winrate = response?.data?.evaluation?.winrate;

        if (typeof winrate === 'number' && Number.isFinite(winrate)) {
          const clamped = Math.max(0, Math.min(1, winrate));
          setWhiteProb(clamped);
          setBlackProb(1 - clamped);
        } else {
          setWhiteProb(null);
          setBlackProb(null);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Erreur lors de la récupération de la probabilité de victoire.';
        setError(message);
        setWhiteProb(null);
        setBlackProb(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchEvaluation();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [gameId]);

  const effectiveWhite = whiteProb ?? 0.5;
  const effectiveBlack = blackProb ?? 0.5;

  const whitePercent = Math.round(effectiveWhite * 100);
  const blackPercent = Math.round(effectiveBlack * 100);

  return (
    <div className="winprob-container">
      <div className="winprob-header">
        <span className="winprob-title">Win probability</span>
        {loading && <span className="winprob-status">Calcul...</span>}
        {!loading && error && <span className="winprob-status winprob-status-error">{error}</span>}
      </div>
      <div className="winprob-bar">
        <div
          className="winprob-segment winprob-segment-white"
          style={{ width: `${whitePercent}%` }}
        >
          <span className="winprob-label winprob-label-left">{whitePercent}% White</span>
        </div>
        <div
          className="winprob-segment winprob-segment-black"
          style={{ width: `${blackPercent}%` }}
        >
          <span className="winprob-label winprob-label-right">{blackPercent}% Black</span>
        </div>
      </div>
    </div>
  );
}
