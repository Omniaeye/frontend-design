import { archiveImage, ArchiveImage } from './media';
import { useEffect, useMemo, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { createNodeImageProgram } from '@sigma/node-image';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import noverlap from 'graphology-layout-noverlap';
import type { Company, ProductEvent, ProductRepository } from '../data/repository.js';
import { PlatformIcon } from '../components/PlatformIcon';
import { formatMetric, type ArchiveCompanyData, type ArchiveSource } from './archiveData';

type Selection = {
  key: string;
  kind: 'company' | 'group' | 'source' | 'event' | 'narrative';
  title: string;
  label: string;
  note: string;
  image?: string | null;
  platform?: string;
  url?: string | null;
  source?: ArchiveSource;
  event?: ProductEvent;
};
type Hover = { selection: Selection; x: number; y: number; width: number; height: number } | null;
const LogoProgram = createNodeImageProgram({
  objectFit: 'contain',
  keepWithinCircle: false,
  correctCentering: true,
  padding: 0.035,
});
const AvatarProgram = createNodeImageProgram({ objectFit: 'cover', keepWithinCircle: true });
const CompanyProgram = createNodeImageProgram({
  objectFit: 'contain',
  keepWithinCircle: false,
  correctCentering: true,
  padding: 0.08,
  drawHover: () => {},
  drawLabel: (context, data) => {
    if (!data.label) return;
    context.save();
    context.font = '600 22px Manrope, sans-serif';
    context.fillStyle = '#dff9e9';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(0,0,0,.8)';
    context.shadowBlur = 8;
    context.fillText(data.label, data.x + data.size + 14, data.y);
    context.restore();
  },
});
const platformImage = (platform: string) =>
  `/assets/archive-graph/platforms/${platform === 'website' ? 'web' : platform}.png`;
const groupNames: Record<string, string> = {
  x: 'X profiles',
  reddit: 'Reddit communities',
  youtube: 'YouTube channels',
  web: 'Web properties',
  github: 'Repositories',
  instagram: 'Instagram profiles',
  threads: 'Threads profiles',
  tiktok: 'TikTok profiles',
  linkedin: 'LinkedIn profiles',
  facebook: 'Facebook profiles',
  bluesky: 'Bluesky profiles',
  discord: 'Discord communities',
  twitch: 'Twitch channels',
  snapchat: 'Snapchat profiles',
  weibo: 'Weibo profiles',
  truthsocial: 'Truth Social profiles',
  news: 'News',
  filings: 'Filings',
  people: 'People',
};
function short(value: string, limit = 46) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}
function metricEntries(source?: ArchiveSource) {
  return Object.entries(source?.metrics || {})
    .filter(([, value]) => value != null)
    .slice(0, 4);
}
function hash(value: string) {
  let out = 2166136261;
  for (let i = 0; i < value.length; i++) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}
function safePoint(key: string, angle: number, radius: number) {
  const seed = hash(key);
  return {
    x: Math.cos(angle) * radius + ((seed % 97) / 97 - 0.5) * 1.8,
    y: Math.sin(angle) * radius + (((seed >>> 8) % 89) / 89 - 0.5) * 1.8,
  };
}
function relationLabel(source: ArchiveSource) {
  const relation = (source.relation || 'mapped source').replaceAll('_', ' ');
  if (source.kind === 'person') return 'affiliated with';
  if (source.platform === 'github') return 'maintained by';
  if (source.platform === 'reddit') return 'discussed in';
  if (source.platform === 'youtube') return 'published through';
  if (source.platform === 'x')
    return relation.includes('professional') ? 'represented by' : 'published through';
  return relation;
}
function chooseSources(archive: ArchiveCompanyData | null) {
  if (!archive) return [];
  const direct = archive.sources.filter((source) => source.platform !== 'github');
  const github = archive.sources
    .filter((source) => source.platform === 'github')
    .sort((a, b) => Number(b.metrics?.stars || 0) - Number(a.metrics?.stars || 0))
    .slice(0, 24);
  return [...direct, ...github].slice(0, 100);
}
function sourceType(source?: ArchiveSource) {
  return source && (source.kind === 'person' || (source.platform === 'x' && Boolean(source.image)))
    ? 'avatar'
    : 'logo';
}

function graphData(repo: ProductRepository, company: Company, archive: ArchiveCompanyData | null) {
  const graph = new Graph({ type: 'undirected', multi: true });
  const selections = new Map<string, Selection>();
  const sources = chooseSources(archive);
  const events = repo.queryEvents({ companyIds: [company.id], limit: 20 }).items;
  const companyImage =
    company.ticker === 'NVDA'
      ? platformImage('nvda')
      : `/assets/archive-graph/companies/${company.ticker}.png`;
  graph.addNode('company', {
    x: 0,
    y: 0,
    size: 40,
    color: 'rgba(0,0,0,0)',
    label: company.name,
    forceLabel: true,
    zIndex: 30,
    type: 'company',
    image: companyImage,
    kind: 'company',
  });
  selections.set('company', {
    key: 'company',
    kind: 'company',
    title: company.name,
    label: `${company.ticker} · Company`,
    note: 'Canonical company identity in the OMNIA registry.',
    image: companyImage,
    url: company.websiteUrl,
  });
  const groups = [
    ...new Set([
      ...sources.map((source) => source.platform),
      ...events.map((event) => event.platform),
    ]),
  ];
  groups.forEach((platform, index) => {
    const angle = (index / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const key = `group:${platform}`;
    const point = safePoint(key, angle, 10);
    graph.addNode(key, {
      ...point,
      size: 14,
      color: '#050c09',
      label: groupNames[platform] || platform,
      forceLabel: true,
      zIndex: 12,
      type: 'logo',
      image: platformImage(platform),
      kind: 'group',
    });
    graph.addEdge('company', key, {
      size: 2.1,
      color: '#426b58',
      weight: 5,
      label: `${company.name} / ${groupNames[platform] || platform}`,
      relation: 'contains',
    });
    selections.set(key, {
      key,
      kind: 'group',
      title: groupNames[platform] || platform,
      label: 'Source family',
      note: `Explore the ${sources.filter((source) => source.platform === platform).length} ${groupNames[platform]?.toLowerCase() || platform} currently mapped to ${company.name}.`,
      image: platformImage(platform),
      platform,
    });
  });
  sources.forEach((source, index) => {
    const groupIndex = groups.indexOf(source.platform);
    const angle = (groupIndex / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const point = safePoint(source.id, angle, 18 + (index % 5) * 0.7);
    const key = `source:${source.id}`;
    const image =
      archiveImage(source.image) ||
      platformImage(source.kind === 'person' ? 'people' : source.platform);
    graph.addNode(key, {
      ...point,
      size: source.kind === 'person' ? 10 : 8.2,
      color: '#050c09',
      label: short(source.label, 28),
      zIndex: 7,
      type: archiveImage(source.image) ? sourceType(source) : 'logo',
      image,
      kind: 'source',
      platform: source.platform,
    });
    graph.addEdge(`group:${source.platform}`, key, {
      size: 0.8,
      color: '#29483a',
      weight: 1.2,
      label: relationLabel(source),
      relation: relationLabel(source),
    });
    selections.set(key, {
      key,
      kind: 'source',
      title: source.label,
      label: `${source.platform.toUpperCase()} · ${source.kind.replaceAll('_', ' ')}`,
      note: source.description || relationLabel(source),
      image,
      platform: source.platform,
      url: source.url,
      source,
    });
  });
  (archive?.research?.themes || []).slice(0, 6).forEach((theme, index) => {
    const key = `narrative:${index}`;
    const angle = Math.PI * 0.25 + index * Math.PI * 0.24;
    const point = safePoint(key, angle, 8.5);
    const title = String(theme.title || 'Reviewed narrative');
    graph.addNode(key, {
      ...point,
      size: 11,
      color: '#0a1711',
      label: short(title, 32),
      zIndex: 10,
      type: 'logo',
      image: platformImage('news'),
      kind: 'narrative',
    });
    graph.addEdge('company', key, {
      size: 1.5,
      color: '#73947f',
      weight: 3,
      label: 'connected narrative',
      relation: 'connected narrative',
    });
    selections.set(key, {
      key,
      kind: 'narrative',
      title,
      label: 'Reviewed narrative',
      note: String(theme.description || 'Reviewed research narrative.'),
      image: platformImage('news'),
      url: typeof theme.url === 'string' ? theme.url : null,
    });
  });
  events.forEach((event, index) => {
    const platform = event.platform;
    if (!platform) return;
    const angle =
      (groups.indexOf(platform) / Math.max(groups.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const key = `event:${event.id}`;
    const point = safePoint(key, angle, 25 + (index % 4) * 0.65);
    graph.addNode(key, {
      ...point,
      size: event.imageUrl ? 7 : 5,
      color: '#0a1711',
      label: short(event.title, 34),
      zIndex: 4,
      type: archiveImage(event.imageUrl) ? 'avatar' : 'logo',
      image: archiveImage(event.imageUrl) || platformImage(event.platform),
      kind: 'event',
      platform: event.platform,
    });
    graph.addEdge(`group:${platform}`, key, {
      size: 0.55,
      color: '#1d362c',
      weight: 0.6,
      label: 'published record',
      relation: 'published record',
    });
    selections.set(key, {
      key,
      kind: 'event',
      title: event.title,
      label: `${event.platform.toUpperCase()} · ${event.eventType.replaceAll('_', ' ')}`,
      note: event.associationNote || event.body || 'Archived public-source record.',
      image: archiveImage(event.imageUrl) || platformImage(event.platform),
      platform: event.platform,
      url: event.url,
      event,
    });
  });
  forceAtlas2.assign(graph, {
    iterations: 160,
    getEdgeWeight: 'weight',
    settings: {
      adjustSizes: false,
      barnesHutOptimize: true,
      edgeWeightInfluence: 1.1,
      gravity: 0.7,
      linLogMode: true,
      scalingRatio: 12,
      slowDown: 6,
      strongGravityMode: false,
    },
  });
  noverlap.assign(graph, {
    maxIterations: 100,
    settings: { margin: 5, expansion: 1.15, ratio: 1.25, speed: 4 },
  });
  return { graph, selections, sources, events };
}

function HoverCard({ hover }: { hover: Hover }) {
  if (!hover) return null;
  const source = hover.selection.source;
  const left = Math.max(12, Math.min(hover.x, hover.width - 340));
  const top = Math.max(12, Math.min(hover.y, hover.height - 190));
  return (
    <div className="archive-graph-hover" style={{ left, top }}>
      {hover.selection.image ? (
        <ArchiveImage
          className={sourceType(source) === 'logo' ? 'is-logo' : ''}
          src={hover.selection.image}
          alt=""
          referrerPolicy="no-referrer"
        />
      ) : (
        <PlatformIcon platform={hover.selection.platform || 'web'} size={22} />
      )}
      <div>
        <span>{hover.selection.label}</span>
        <strong>{hover.selection.title}</strong>
        {source?.handle && <b>{source.handle}</b>}
        <p>{hover.selection.note}</p>
        {metricEntries(source).length > 0 && (
          <footer>
            {metricEntries(source)
              .slice(0, 3)
              .map(([key, value]) => (
                <span key={key}>
                  <b>{formatMetric(value)}</b>
                  {key.replaceAll('_', ' ')}
                </span>
              ))}
          </footer>
        )}
      </div>
    </div>
  );
}

export function RelationshipGraph({
  repo,
  company,
  archive,
  onOpen,
}: {
  repo: ProductRepository;
  company: Company;
  archive: ArchiveCompanyData | null;
  onOpen: (event: ProductEvent) => void;
}) {
  const openRef = useRef(onOpen);
  openRef.current = onOpen;
  const graphKey = JSON.stringify([
    company.id,
    company.name,
    company.ticker,
    chooseSources(archive),
    archive?.research?.themes,
    repo.queryEvents({ companyIds: [company.id], limit: 20 }).items,
  ]);
  const container = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Sigma | null>(null);
  const focusedRef = useRef<string | null>(null);
  const { graph, selections, sources, events } = useMemo(
    () => graphData(repo, company, archive),
    [graphKey],
  );
  const [hover, setHover] = useState<Hover>(null);
  const [labels, setLabels] = useState(false);
  const focusNode = (node: string | null) => {
    focusedRef.current = focusedRef.current === node ? null : node;
    setHover(null);
    rendererRef.current?.refresh();
  };
  useEffect(() => {
    if (!container.current) return;
    const compact = matchMedia('(max-width: 700px)').matches;
    const renderer = new Sigma(graph, container.current, {
      allowInvalidContainer: true,
      nodeProgramClasses: { company: CompanyProgram, logo: LogoProgram, avatar: AvatarProgram },
      renderEdgeLabels: !compact,
      labelFont: 'IBM Plex Mono',
      labelSize: 9,
      labelWeight: '400',
      labelColor: { color: '#cbd9d1' },
      edgeLabelSize: 7,
      edgeLabelColor: { color: '#87a794' },
      labelDensity: compact ? 0.16 : 0.45,
      labelGridCellSize: compact ? 170 : 130,
      labelRenderedSizeThreshold: labels ? 6 : 12,
      defaultEdgeColor: '#29483a',
      zIndex: true,
      minCameraRatio: 0.18,
      maxCameraRatio: 3.4,
      enableEdgeEvents: true,
      nodeReducer: (node, data) => {
        const focused = focusedRef.current;
        const compactLabel =
          compact && !labels && data.kind === 'group' ? { label: '', forceLabel: false } : {};
        if (!focused) return { ...data, ...compactLabel };
        const adjacent = node === focused || graph.areNeighbors(node, focused);
        return {
          ...data,
          ...compactLabel,
          color: adjacent ? data.color : '#07100c',
          hidden: false,
          label: adjacent ? (compactLabel.label ?? data.label) : '',
          zIndex: adjacent ? 30 : 0,
        };
      },
      edgeReducer: (edge, data) => {
        const focused = focusedRef.current;
        if (!focused) return { ...data, forceLabel: false };
        const [source, target] = graph.extremities(edge);
        const active = source === focused || target === focused;
        return {
          ...data,
          color: active ? '#8ff5ba' : '#14271f',
          size: active ? 1.8 : 0.35,
          forceLabel: !compact && active,
        };
      },
    });
    rendererRef.current = renderer;
    renderer.on('enterNode', ({ node, event }) => {
      const next = selections.get(node);
      if (next)
        setHover({
          selection: next,
          x: event.x + 16,
          y: event.y + 12,
          width: container.current?.clientWidth || 340,
          height: container.current?.clientHeight || 190,
        });
    });
    renderer.on('leaveNode', () => {
      if (!matchMedia('(hover: none)').matches) setHover(null);
    });
    renderer.on('clickNode', ({ node }) => {
      const next = selections.get(node);
      focusNode(node);
      if (next?.event) openRef.current(next.event);
      else if (next && matchMedia('(hover: none)').matches)
        setHover({
          selection: next,
          x: 12,
          y: 12,
          width: container.current?.clientWidth || 340,
          height: container.current?.clientHeight || 190,
        });
    });
    renderer.on('clickStage', () => focusNode(null));
    renderer.getCamera().animatedReset({ duration: 650 });
    return () => {
      rendererRef.current = null;
      renderer.kill();
    };
  }, [graph, selections, labels]);
  return (
    <section className="relationship-observatory">
      <header className="relationship-heading">
        <div>
          <span>RELATIONSHIPS</span>
          <h2>{company.name}</h2>
          <p>
            {archive?.sources.length || sources.length} mapped sources · {sources.length} visible
            nodes · {events.length} recent records
          </p>
        </div>
        <div className="relationship-controls">
          <button onClick={() => setLabels((value) => !value)} aria-pressed={labels}>
            {labels ? 'Hide labels' : 'Show labels'}
          </button>
          <button onClick={() => focusNode(null)}>Reset focus</button>
        </div>
      </header>
      <div className="relationship-stage">
        <div
          className="relationship-canvas"
          ref={container}
          aria-label={`${company.name} relationship network`}
        />
        <HoverCard hover={hover} />
      </div>
      <div className="relationship-instruction">
        Hover for details · Click to focus a path · Scroll to zoom
      </div>
    </section>
  );
}
