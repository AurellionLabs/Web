'use client';

import { useEffect, useRef } from 'react';

// EVA/NERV mermaid theme — dark obsidian + gold/crimson
const EVA_THEME_VARS = {
  // Base
  background: 'hsl(0 0% 5%)',
  mainBkg: 'hsl(0 0% 8%)',
  nodeBorder: 'hsl(43 40% 32%)',
  clusterBkg: 'hsl(0 0% 7%)',
  clusterBorder: 'hsl(43 25% 22%)',
  defaultLinkColor: 'hsl(43 30% 40%)',
  titleColor: 'hsl(43 65% 68%)',
  edgeLabelBackground: 'hsl(0 0% 7%)',
  // Nodes
  primaryColor: 'hsl(0 0% 9%)',
  primaryBorderColor: 'hsl(43 50% 38%)',
  primaryTextColor: 'hsl(43 65% 72%)',
  secondaryColor: 'hsl(0 0% 8%)',
  secondaryBorderColor: 'hsl(0 50% 30%)',
  secondaryTextColor: 'hsl(0 0% 70%)',
  tertiaryColor: 'hsl(0 0% 7%)',
  tertiaryBorderColor: 'hsl(200 40% 28%)',
  tertiaryTextColor: 'hsl(200 50% 65%)',
  // Text
  lineColor: 'hsl(43 25% 38%)',
  fontFamily: '"Space Mono", monospace',
  fontSize: '12px',
  // Sequence
  actorBkg: 'hsl(0 0% 9%)',
  actorBorder: 'hsl(0 60% 30%)',
  actorTextColor: 'hsl(0 0% 75%)',
  actorLineColor: 'hsl(43 25% 30%)',
  signalColor: 'hsl(43 50% 55%)',
  signalTextColor: 'hsl(43 65% 72%)',
  labelBoxBkgColor: 'hsl(0 0% 7%)',
  labelBoxBorderColor: 'hsl(43 25% 25%)',
  labelTextColor: 'hsl(0 0% 65%)',
  activationBkgColor: 'hsl(0 0% 11%)',
  activationBorderColor: 'hsl(0 50% 30%)',
  // Git graph
  git0: 'hsl(43 65% 55%)',
  git1: 'hsl(0 65% 45%)',
  git2: 'hsl(200 55% 50%)',
  git3: 'hsl(142 45% 45%)',
  gitBranchLabel0: 'hsl(0 0% 10%)',
  gitInv0: 'hsl(0 0% 10%)',
};

export function DocContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const nodes = ref.current.querySelectorAll<HTMLElement>(
      'pre.mermaid-diagram',
    );
    if (nodes.length === 0) return;

    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: EVA_THEME_VARS,
        fontFamily: '"Space Mono", monospace',
        flowchart: {
          curve: 'cardinal',
          padding: 16,
          htmlLabels: true,
          useMaxWidth: true,
        },
        sequence: {
          showSequenceNumbers: false,
          actorMargin: 60,
          boxTextMargin: 8,
          noteMargin: 10,
          messageMargin: 45,
          useMaxWidth: true,
        },
        er: { useMaxWidth: true },
        gantt: { useMaxWidth: true },
      });

      nodes.forEach(async (node) => {
        const encoded = node.getAttribute('data-graph');
        if (!encoded) return;
        const graphDef = decodeURIComponent(encoded);
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        try {
          const { svg } = await mermaid.render(id, graphDef);
          node.innerHTML = svg;
          node.classList.add('mermaid-rendered');
        } catch (err) {
          // On error show a styled fallback
          node.innerHTML = `<div class="mermaid-error">Diagram parse error</div>`;
          console.warn('Mermaid render error:', err);
        }
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
