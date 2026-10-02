import { page, p, section as s, steps, table, links } from './helpers.js';
export const customSourcePages = {
  'custom-sources': page('Custom sources', 'Your communities. Your repositories. Your channels.',
    p('Track public sources beyond the company catalog. Read their publications and follow changes to their identity in one private workspace. Custom sources are in a controlled beta and are not available in production yet.') +
    s('access', 'Your source allowance', table(['Access', 'Reddit', 'GitHub', 'YouTube'], [
      ['1,000,000+ tokens', '5 communities', '5 repositories', '5 channels'],
    ]) + p('Custom sources require a verified balance of at least 1,000,000 tokens. Access is checked when adding or resuming a source and rechecked by the service. These slots are separate from companies you follow and from Discord or Telegram destinations. A GitHub slot covers one repository, not an entire organization.')) +
    s('add', 'Add a source', steps([
      'Open <strong>Settings → Custom sources</strong>. You can also reach it from <strong>Following → Custom sources &amp; activity</strong>.',
      'Choose Reddit, GitHub or YouTube. Paste the direct public community, repository or channel URL.',
      'Select <strong>Add source</strong>. OMNIA checks the source identity before saving it.',
      'Check <strong>Posts</strong> and <strong>Changes</strong> separately. Open <strong>Details</strong> for coverage and the next scheduled check.',
    ]) + table(['Source', 'Accepted example'], [
      ['Reddit', 'https://www.reddit.com/r/technology'], ['GitHub', 'https://github.com/mrdoob/three.js'], ['YouTube', 'https://www.youtube.com/@youtube'],
    ])) +
    s('collect', 'What gets collected', table(['Source', 'Publications', 'Observed changes'], [
      ['Reddit', 'Recent public posts from the New listing.', 'Display name, description, About text, photo, banner, header, language, colors and submission text from supported profile captures.'],
      ['YouTube', 'Recent public uploads from the verified channel.', 'Title, description, avatar URL, supported banner fields and channel settings returned by the source.'],
      ['GitHub', 'Recent commits on the default branch.', 'Repository settings, description, owner, topics, README identity and the recent public release window.'],
    ]) + p('Public feeds collect Reddit posts and YouTube uploads. Profile changes use a separate collection: archived Reddit community captures, public YouTube channel profiles or a configured metadata API. A source shows <strong>Not included</strong> when that profile collection is unavailable. Posts and changes have separate schedules and status.') + p('The first metadata capture establishes a baseline. A later difference creates a change record. Missing fields remain unknown; they are not treated as deletions. Photos and banners are compared by their recorded URLs. A new URL can point to the same image; replacing an image at the same URL may not create a change record.')) +
    s('panel', 'Bring it into a panel', steps([
      'Open <strong>+ Panel</strong>, then its settings.', 'Set <strong>Content → Custom sources</strong>.',
      'Choose all active sources or select individual sources. Choose <strong>All activity</strong>, <strong>Publications</strong>, <strong>All source changes</strong> or a specific change, such as <strong>Banner changed</strong>.',
      'Add a search term if needed. Review Preview, then select <strong>Apply</strong>.',
    ]) + p('Custom-source panels use your source subscriptions. They do not inherit company Following filters. Saved Discord and Telegram destinations remain available in Integrations, but delivery and sound alerts for custom-source panels are not enabled in this phase.')) +
    s('evidence', 'Read a change', p('Open <strong>Source activity</strong> and expand <strong>Compare</strong> to see the values before and after a change. Select <strong>View evidence</strong> on either side to inspect the capture. Publications link to the original post, video or commit; capture details are under <strong>Details</strong>.') + p('Publications are ordered by publication time; changes use observation time. Rechecking an older post does not move it to the top. Capture time is not an exact edit time. GitHub commit time is not a verified push time. Adding a source does not establish an official company affiliation.')) +
    s('status', 'Know what is running', table(['Status', 'Meaning'], [
      ['Queued', 'The source is registered; no successful capture has completed yet.'], ['Collecting', 'The last scheduled collection succeeded. Check its capture time and coverage.'],
      ['Not included', 'This collection method does not provide these signals. Check Posts and Changes separately; a working publication feed does not establish profile coverage.'],
      ['Partial', 'Part of the capture succeeded; another metadata or availability check failed.'], ['Unavailable / Error', 'A provider, permission, quota or request failure needs attention. Available observations remain subject to retention.'],
      ['Delayed', 'The next scheduled capture is overdue. The previous capture remains available; check its timestamp.'],
      ['Paused', 'Your subscription is paused. Resume rechecks access and available slots.'], ['Disabled', 'The corresponding collector is not enabled in this environment.'],
    ])) +
    s('manage', 'Pause, resume or remove', p('Pause stops your subscription and releases its active slot. Resume verifies your holder access again. Remove deletes your subscription, not another account’s source. Shared public sources are collected once across eligible subscribers; pausing one account does not stop another account’s active subscription. Up to ten verification or reactivation attempts per platform are allowed each UTC day.')) +
    s('coverage', 'Timing and coverage', p('Publications and profile changes run on separate schedules. Publication checks start from a five-minute target. Public YouTube profile checks start from one hour and back off for stable channels. The current Reddit profile campaign checks its selected communities daily for three captures; it is not a continuous edit stream. OMNIA increases these intervals when the shared platform budget cannot cover all unique sources. Settings shows the current collection schedule. Several people following the same source share one collection. Retries and queue delays can extend the wait. The browser checks activity every thirty seconds while this view is open.') +
      table(['Source', 'Window per successful check'], [['Reddit', 'Public feed: up to 25 posts. API mode: up to 100 public posts.'], ['YouTube', 'Public feed: the recent videos returned by the channel feed, usually 15. API mode: up to 50 public uploads.'], ['GitHub', 'Latest 100 default-branch commits; metadata includes up to 30 releases.']]) +
      p('Activity displays the latest 100 publications and 100 changes within the retention window. Full-history browsing is not enabled here. Busy sources can publish more than one window between checks. Comments, captions, other GitHub branches and historical backfill are outside this phase.')) +
    s('retention', 'When content changes or disappears', p('In API mode with retention enabled, stored Reddit posts and YouTube videos are checked again by their original IDs. Edited public content is refreshed. Content confirmed removed, private or unavailable is withdrawn from activity and its stored captures. Public-feed mode refreshes records seen in a later feed and expires old captures; it cannot confirm deletion by original ID. Leaving the recent-post list alone does not mean deletion.') +
      p('The validation environment supports a 48-hour Reddit cache window and a 30-day YouTube cache window. Old captures expire; a new public observation can refresh the current record. GitHub history is not automatically expired by this policy. These controls are configured by the service operator before rollout.')) +
    links([['source-changes', 'Understand source changes'], ['following', 'Company Following'], ['integrations', 'Discord & Telegram']]), { updated: '2026-09-25' }),
  'source-changes': page('Source changes', 'See what changed. Keep the evidence.',
    s('signals', 'Changes across sources', table(['Platform', 'Signal'], [
      ['Reddit', 'Display name, description, About text, photo, banner, header, submission text, language and colors. Rules and pinned posts are not included in the current profile campaign.'], ['YouTube', 'Channel identity and available branding fields.'],
      ['GitHub', 'Repository metadata, default-branch README identity and recent releases.'], ['X', 'Observed name, handle, bio, avatar, banner, location and website changes with original before/after evidence.'],
      ['Website', 'Title, description and selected page text from configured HTML sources.'],
    ]) + p('Coverage depends on the configured collector and the fields supplied by that source. X and website changes use existing catalog sources; they are not additional holder source slots.')) +
    s('panels', 'Choose changes in a panel', steps([
      'Open a panel gear. Under <strong>Event types</strong>, expand the platform.',
      'Select <strong>Source change</strong> for all observed changes, or choose <strong>Photo changed</strong>, <strong>Banner changed</strong>, <strong>Name changed</strong> or <strong>Description changed</strong>.',
      'Keep <strong>Following</strong> to use your companies, or choose <strong>All collected content</strong> for every collected source, including reference communities.',
      'Review Preview and select <strong>Apply</strong>. Filters narrow stored observations; opening a panel does not start another collection.',
    ]) + p('For a quick setup, open <strong>Browse presets → Source changes</strong>. Choose Profile changes, Visual updates, Reddit community changes, YouTube channel changes or Repository updates. These presets use catalog activity; custom subscriptions use <strong>Content → Custom sources</strong>.')) +
    s('filters', 'Available filters', table(['Filter', 'Includes'], [
      ['Photo changed', 'Community or channel photo and supported profile avatars.'],
      ['Banner changed', 'Banner, mobile banner and header image URLs.'],
      ['Name changed', 'Display name, handle and repository identity.'],
      ['Description changed', 'Description, bio and community About text.'],
      ['Links changed', 'Website and supported external links.'],
      ['Settings changed', 'Language, location, colors and supported repository or channel settings.'],
      ['README changed', 'The tracked default-branch README identity.'],
      ['Releases changed', 'Differences in the observed recent release window.'],
      ['Page content changed', 'Selected text from configured website sources.'],
    ]) + p('Each platform lists its supported filters. Availability depends on successful collection. Selecting a filter does not create missing observations.')) +
    s('compare', 'A baseline, then a comparison', steps(['Capture a known public value.', 'Compare the next known value for the same source identity.', 'Record the difference with both observations and detection time.']) + p('A failed request does not mean removal. A missing field does not erase an earlier value. A newly seen field starts its own baseline. Repeated captures do not create repeated change events. Expand <strong>Compare</strong> on a change card to see Before and After. Supported photos and banners appear side by side; an unavailable image keeps its recorded URL. Changes are ordered by observation time, not an invented publication time.')) +
    s('scope', 'Keep the right context', p('A change belongs to its source. It does not automatically add a company, imply an endorsement or establish that an author works for a business. Company associations use reviewed source mappings.') + p('Read source changes in OMNIA. Discord and Telegram delivery is not enabled for these events.')) +
    links([['custom-sources', 'Configure custom sources'], ['preset-library', 'Browse presets'], ['time-and-evidence', 'Times and evidence']]), { updated: '2026-09-25' }),
};

customSourcePages['custom-sources'].updated='2026-09-25';
