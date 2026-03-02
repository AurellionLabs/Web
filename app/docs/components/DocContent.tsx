'use client';

import { useEffect, useRef } from 'react';

const EVA_THEME_VARS = {
  background: '#0d0d0d',
  mainBkg: '#141414',
  nodeBorder: '#7a5f28',
  clusterBkg: '#111111',
  clusterBorder: '#3a2e12',
  defaultLinkColor: '#6b5420',
  titleColor: '#c5a55a',
  edgeLabelBackground: '#111111',
  primaryColor: '#141414',
  primaryBorderColor: '#8a6a30',
  primaryTextColor: '#c5a55a',
  secondaryColor: '#111111',
  secondaryBorderColor: '#6b1a1a',
  secondaryTextColor: '#b07070',
  tertiaryColor: '#0f0f0f',
  tertiaryBorderColor: '#2a4a6a',
  tertiaryTextColor: '#5a8aaa',
  lineColor: '#5a4820',
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '12px',
  // Sequence diagram
  actorBkg: '#141414',
  actorBorder: '#6b1a1a',
  actorTextColor: '#c0c0c0',
  actorLineColor: '#4a3810',
  signalColor: '#a08840',
  signalTextColor: '#c5a55a',
  labelBoxBkgColor: '#111111',
  labelBoxBorderColor: '#3a2e12',
  labelTextColor: '#909090',
  activationBkgColor: '#1a1a1a',
  activationBorderColor: '#6b1a1a',
  loopTextColor: '#c5a55a',
  noteBkgColor: '#111111',
  noteBorderColor: '#3a2e12',
  noteTextColor: '#909090',
};

export function DocContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const nodes = container.querySelectorAll<HTMLElement>(
      'pre.mermaid-diagram',
    );
    if (nodes.length === 0) return;

    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'base',
        themeVariables: EVA_THEME_VARS,
        fontFamily: '"Space Mono", "Courier New", monospace',
        flowchart: {
          curve: 'cardinal',
          padding: 20,
          htmlLabels: true,
          useMaxWidth: true,
        },
        sequence: {
          actorMargin: 60,
          messageMargin: 40,
          useMaxWidth: true,
          boxTextMargin: 6,
        },
      });

      mermaid
        .run({
          nodes: Array.from(nodes),
          suppressErrors: false,
        })
        .catch((err) => {
          console.warn('Mermaid render error:', err);
        });
    });
  }, [html]);

  return (
    <div
      ref={ref}
      className="doc-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
