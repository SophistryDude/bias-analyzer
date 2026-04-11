/**
 * Extended Seed Script — 200 Pundits & Organizations
 *
 * Populates the full target list from docs/pundit-list-200.md
 * Run with: npx tsx src/lib/db/seed-200.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

interface PunditSeed {
  id: string;
  name: string;
  slug: string;
  platforms: string[];
  currentLeaning: string;
  description: string;
  knownFor: string[];
  tags: string[];
  externalLinks?: { platform: string; url: string }[];
}

// ─── Cable News Hosts (30) ──────────────────────────────────────────

const CABLE_NEWS: PunditSeed[] = [
  // Fox News
  { id: "jesse-watters", name: "Jesse Watters", slug: "jesse-watters", platforms: ["cable-news"], currentLeaning: "right", description: "Fox News primetime host. Formerly of The O'Reilly Factor, now hosts Jesse Watters Primetime.", knownFor: ["Jesse Watters Primetime", "Fox News"], tags: ["cable-news", "fox-news", "primetime"] },
  { id: "greg-gutfeld", name: "Greg Gutfeld", slug: "greg-gutfeld", platforms: ["cable-news"], currentLeaning: "right", description: "Fox News late-night host. Known for comedic approach to political commentary.", knownFor: ["Gutfeld!", "The Five", "Fox News"], tags: ["cable-news", "fox-news", "late-night"] },
  { id: "sean-hannity", name: "Sean Hannity", slug: "sean-hannity", platforms: ["cable-news", "podcast"], currentLeaning: "right", description: "Fox News primetime host and radio personality. One of the longest-running conservative media voices.", knownFor: ["Hannity", "Fox News", "Radio"], tags: ["cable-news", "fox-news", "radio"] },
  { id: "laura-ingraham", name: "Laura Ingraham", slug: "laura-ingraham", platforms: ["cable-news", "podcast"], currentLeaning: "right", description: "Fox News primetime host. Conservative commentator with legal background.", knownFor: ["The Ingraham Angle", "Fox News"], tags: ["cable-news", "fox-news", "primetime"] },
  { id: "bret-baier", name: "Bret Baier", slug: "bret-baier", platforms: ["cable-news"], currentLeaning: "center-right", description: "Fox News chief political anchor. Known for straighter news presentation compared to opinion hosts.", knownFor: ["Special Report", "Fox News"], tags: ["cable-news", "fox-news", "anchor"] },
  { id: "dana-perino", name: "Dana Perino", slug: "dana-perino", platforms: ["cable-news"], currentLeaning: "center-right", description: "Fox News co-host of The Five. Former White House Press Secretary under George W. Bush.", knownFor: ["The Five", "Fox News", "White House Press Secretary"], tags: ["cable-news", "fox-news", "the-five"] },
  { id: "jeanine-pirro", name: "Jeanine Pirro", slug: "jeanine-pirro", platforms: ["cable-news"], currentLeaning: "right", description: "Fox News co-host of The Five. Former judge and prosecutor.", knownFor: ["The Five", "Justice with Judge Jeanine"], tags: ["cable-news", "fox-news", "the-five"] },
  { id: "harold-ford-jr", name: "Harold Ford Jr.", slug: "harold-ford-jr", platforms: ["cable-news"], currentLeaning: "center", description: "Fox News co-host of The Five. Former Democratic congressman, moderate voice on the panel.", knownFor: ["The Five", "Fox News"], tags: ["cable-news", "fox-news", "the-five", "moderate"] },
  { id: "maria-bartiromo", name: "Maria Bartiromo", slug: "maria-bartiromo", platforms: ["cable-news"], currentLeaning: "right", description: "Fox Business and Fox News morning host. Formerly of CNBC.", knownFor: ["Mornings with Maria", "Fox Business"], tags: ["cable-news", "fox-news", "business"] },
  { id: "harris-faulkner", name: "Harris Faulkner", slug: "harris-faulkner", platforms: ["cable-news"], currentLeaning: "center-right", description: "Fox News daytime anchor. Hosts Faulkner Focus and co-hosts Outnumbered.", knownFor: ["Faulkner Focus", "Outnumbered"], tags: ["cable-news", "fox-news", "daytime"] },
  // MSNBC
  { id: "joy-reid", name: "Joy Reid", slug: "joy-reid", platforms: ["cable-news"], currentLeaning: "left", description: "MSNBC primetime host. Known for progressive commentary on race and politics.", knownFor: ["The ReidOut", "MSNBC"], tags: ["cable-news", "msnbc", "primetime"] },
  { id: "lawrence-odonnell", name: "Lawrence O'Donnell", slug: "lawrence-odonnell", platforms: ["cable-news"], currentLeaning: "left", description: "MSNBC primetime host. Former Senate staffer and TV writer.", knownFor: ["The Last Word", "MSNBC"], tags: ["cable-news", "msnbc", "primetime"] },
  { id: "chris-hayes", name: "Chris Hayes", slug: "chris-hayes", platforms: ["cable-news", "podcast"], currentLeaning: "left", description: "MSNBC primetime host and podcaster. Known for in-depth policy discussion.", knownFor: ["All In", "MSNBC", "Why Is This Happening? podcast"], tags: ["cable-news", "msnbc", "primetime"] },
  { id: "ari-melber", name: "Ari Melber", slug: "ari-melber", platforms: ["cable-news"], currentLeaning: "center-left", description: "MSNBC evening host with legal background. Known for hip-hop references in political analysis.", knownFor: ["The Beat", "MSNBC"], tags: ["cable-news", "msnbc", "evening"] },
  { id: "nicolle-wallace", name: "Nicolle Wallace", slug: "nicolle-wallace", platforms: ["cable-news"], currentLeaning: "center-left", description: "MSNBC afternoon host. Former Republican communications director who shifted left.", knownFor: ["Deadline: White House", "MSNBC"], tags: ["cable-news", "msnbc", "afternoon"] },
  { id: "stephanie-ruhle", name: "Stephanie Ruhle", slug: "stephanie-ruhle", platforms: ["cable-news"], currentLeaning: "center-left", description: "MSNBC primetime anchor. Business journalism background.", knownFor: ["The 11th Hour", "MSNBC"], tags: ["cable-news", "msnbc", "primetime"] },
  { id: "alex-wagner", name: "Alex Wagner", slug: "alex-wagner", platforms: ["cable-news"], currentLeaning: "left", description: "MSNBC primetime host.", knownFor: ["Alex Wagner Tonight", "MSNBC"], tags: ["cable-news", "msnbc", "primetime"] },
  // CNN
  { id: "jake-tapper", name: "Jake Tapper", slug: "jake-tapper", platforms: ["cable-news"], currentLeaning: "center-left", description: "CNN lead anchor. Known for confrontational interview style across the political spectrum.", knownFor: ["The Lead", "CNN"], tags: ["cable-news", "cnn", "anchor"] },
  { id: "anderson-cooper", name: "Anderson Cooper", slug: "anderson-cooper", platforms: ["cable-news"], currentLeaning: "center-left", description: "CNN primetime anchor. Known for field reporting and 60 Minutes contributions.", knownFor: ["Anderson Cooper 360", "CNN", "60 Minutes"], tags: ["cable-news", "cnn", "primetime"] },
  { id: "kaitlan-collins", name: "Kaitlan Collins", slug: "kaitlan-collins", platforms: ["cable-news"], currentLeaning: "center", description: "CNN primetime anchor. Rose from White House correspondent to primetime.", knownFor: ["The Source", "CNN"], tags: ["cable-news", "cnn", "primetime"] },
  { id: "erin-burnett", name: "Erin Burnett", slug: "erin-burnett", platforms: ["cable-news"], currentLeaning: "center", description: "CNN evening anchor. Business journalism background.", knownFor: ["Erin Burnett OutFront", "CNN"], tags: ["cable-news", "cnn", "evening"] },
  { id: "wolf-blitzer", name: "Wolf Blitzer", slug: "wolf-blitzer", platforms: ["cable-news"], currentLeaning: "center", description: "CNN veteran anchor. Known for breaking news coverage.", knownFor: ["The Situation Room", "CNN"], tags: ["cable-news", "cnn", "afternoon"] },
  { id: "abby-phillip", name: "Abby Phillip", slug: "abby-phillip", platforms: ["cable-news"], currentLeaning: "center-left", description: "CNN primetime anchor and political correspondent.", knownFor: ["NewsNight", "CNN"], tags: ["cable-news", "cnn", "primetime"] },
  // Other Cable/Broadcast
  { id: "george-stephanopoulos", name: "George Stephanopoulos", slug: "george-stephanopoulos", platforms: ["cable-news"], currentLeaning: "center-left", description: "ABC News anchor. Former Clinton White House communications director.", knownFor: ["Good Morning America", "This Week", "ABC News"], tags: ["broadcast", "abc", "anchor"] },
  { id: "chuck-todd", name: "Chuck Todd", slug: "chuck-todd", platforms: ["cable-news"], currentLeaning: "center", description: "Former NBC Meet the Press moderator. Political analyst.", knownFor: ["Meet the Press", "NBC News"], tags: ["broadcast", "nbc", "anchor"] },
  { id: "chris-wallace", name: "Chris Wallace", slug: "chris-wallace", platforms: ["cable-news"], currentLeaning: "center", description: "Veteran journalist. Formerly Fox News Sunday, then CNN.", knownFor: ["Fox News Sunday", "CNN"], tags: ["cable-news", "anchor"] },
  { id: "megyn-kelly", name: "Megyn Kelly", slug: "megyn-kelly", platforms: ["podcast", "youtube"], currentLeaning: "center-right", description: "Independent media host. Formerly Fox News and NBC. Podcast has grown significantly.", knownFor: ["The Megyn Kelly Show", "Fox News", "NBC"], tags: ["podcast", "independent", "formerly-cable"] },
  { id: "dan-bongino", name: "Dan Bongino", slug: "dan-bongino", platforms: ["podcast", "cable-news", "youtube"], currentLeaning: "right", description: "Conservative commentator, radio host, and former Secret Service agent.", knownFor: ["The Dan Bongino Show", "Fox News"], tags: ["podcast", "radio", "fox-news", "conservative"] },
  { id: "bill-maher", name: "Bill Maher", slug: "bill-maher", platforms: ["cable-news", "youtube"], currentLeaning: "center-left", description: "HBO host of Real Time. Known for irreverent political commentary from a liberal-libertarian perspective.", knownFor: ["Real Time with Bill Maher", "HBO"], tags: ["hbo", "late-night", "comedy"] },
];

// ─── YouTube & Podcast Commentators (60) ────────────────────────────

const YOUTUBE_PODCAST: PunditSeed[] = [
  // Right / Center-Right (beyond what's already seeded)
  { id: "steven-crowder", name: "Steven Crowder", slug: "steven-crowder", platforms: ["youtube", "streaming"], currentLeaning: "right", description: "Conservative commentator known for Change My Mind segments and comedic political commentary.", knownFor: ["Louder with Crowder", "Change My Mind"], tags: ["youtube", "conservative", "comedy"], externalLinks: [{ platform: "youtube", url: "https://youtube.com/@StevenCrowder" }] },
  { id: "matt-walsh", name: "Matt Walsh", slug: "matt-walsh", platforms: ["youtube", "podcast"], currentLeaning: "right", description: "Daily Wire host and filmmaker. Known for culture war commentary.", knownFor: ["The Matt Walsh Show", "Daily Wire", "What Is a Woman?"], tags: ["youtube", "daily-wire", "conservative"] },
  { id: "michael-knowles", name: "Michael Knowles", slug: "michael-knowles", platforms: ["youtube", "podcast"], currentLeaning: "right", description: "Daily Wire host. Conservative Catholic perspective.", knownFor: ["The Michael Knowles Show", "Daily Wire"], tags: ["youtube", "daily-wire", "conservative"] },
  { id: "jordan-peterson", name: "Jordan Peterson", slug: "jordan-peterson", platforms: ["youtube", "podcast"], currentLeaning: "center-right", description: "Psychologist and public intellectual. Focuses on personal responsibility, free speech, and critiques of postmodernism.", knownFor: ["12 Rules for Life", "Maps of Meaning", "Daily Wire"], tags: ["youtube", "podcast", "intellectual"], externalLinks: [{ platform: "youtube", url: "https://youtube.com/@JordanBPeterson" }] },
  { id: "charlie-kirk", name: "Charlie Kirk", slug: "charlie-kirk", platforms: ["youtube", "podcast"], currentLeaning: "right", description: "Turning Point USA founder. Top conservative podcast. Youth-focused conservative activism.", knownFor: ["Turning Point USA", "The Charlie Kirk Show"], tags: ["youtube", "podcast", "conservative", "youth"] },
  { id: "dave-rubin", name: "Dave Rubin", slug: "dave-rubin", platforms: ["youtube", "podcast"], currentLeaning: "center-right", description: "Host of The Rubin Report. Former progressive who shifted right. Focuses on free speech and classical liberalism.", knownFor: ["The Rubin Report"], tags: ["youtube", "podcast", "classical-liberal"] },
  { id: "dennis-prager", name: "Dennis Prager", slug: "dennis-prager", platforms: ["youtube"], currentLeaning: "right", description: "Founder of PragerU. Conservative radio host and author.", knownFor: ["PragerU", "The Dennis Prager Show"], tags: ["youtube", "conservative", "education"], externalLinks: [{ platform: "youtube", url: "https://youtube.com/@PragerU" }] },
  { id: "glenn-beck", name: "Glenn Beck", slug: "glenn-beck", platforms: ["youtube", "streaming", "podcast"], currentLeaning: "right", description: "BlazeTV founder. Former Fox News and CNN host. Conservative media mogul.", knownFor: ["BlazeTV", "The Glenn Beck Program"], tags: ["streaming", "conservative", "blaze-tv"] },
  { id: "mark-levin", name: "Mark Levin", slug: "mark-levin", platforms: ["cable-news", "podcast"], currentLeaning: "right", description: "Conservative radio host and Fox News host. Constitutional lawyer.", knownFor: ["Life, Liberty & Levin", "The Mark Levin Show"], tags: ["radio", "fox-news", "conservative"] },
  { id: "dinesh-dsouza", name: "Dinesh D'Souza", slug: "dinesh-dsouza", platforms: ["youtube", "podcast"], currentLeaning: "right", description: "Conservative filmmaker and author. Known for political documentaries.", knownFor: ["2000 Mules", "America: Imagine the World Without Her"], tags: ["youtube", "filmmaker", "conservative"] },
  { id: "benny-johnson", name: "Benny Johnson", slug: "benny-johnson", platforms: ["youtube", "podcast"], currentLeaning: "right", description: "Turning Point USA media personality. Social media focused conservative content.", knownFor: ["Turning Point USA"], tags: ["youtube", "conservative", "social-media"] },
  { id: "jack-posobiec", name: "Jack Posobiec", slug: "jack-posobiec", platforms: ["youtube", "streaming"], currentLeaning: "right", description: "Conservative political activist and media personality.", knownFor: ["Human Events Daily"], tags: ["youtube", "conservative", "activist"] },
  { id: "lauren-chen", name: "Lauren Chen", slug: "lauren-chen", platforms: ["youtube"], currentLeaning: "right", description: "Conservative commentator. Connected to Tenet Media Russian funding controversy.", knownFor: ["YouTube commentary"], tags: ["youtube", "conservative"] },
  { id: "brandon-tatum", name: "Brandon Tatum", slug: "brandon-tatum", platforms: ["youtube"], currentLeaning: "right", description: "Former police officer turned conservative commentator.", knownFor: ["The Officer Tatum"], tags: ["youtube", "conservative"] },
  // Left / Center-Left
  { id: "cenk-uygur", name: "Cenk Uygur", slug: "cenk-uygur", platforms: ["youtube", "streaming"], currentLeaning: "left", description: "Founder of The Young Turks, one of the largest progressive online news shows.", knownFor: ["The Young Turks"], tags: ["youtube", "progressive", "tyt"], externalLinks: [{ platform: "youtube", url: "https://youtube.com/@TheYoungTurks" }] },
  { id: "ana-kasparian", name: "Ana Kasparian", slug: "ana-kasparian", platforms: ["youtube"], currentLeaning: "center-left", description: "TYT co-host who has publicly shifted away from progressive orthodoxy on several issues.", knownFor: ["The Young Turks"], tags: ["youtube", "tyt", "independent"] },
  { id: "hasan-piker", name: "Hasan Piker", slug: "hasan-piker", platforms: ["youtube", "streaming"], currentLeaning: "left", description: "Twitch streamer and political commentator. One of the largest political streamers.", knownFor: ["HasanAbi", "Twitch"], tags: ["streaming", "twitch", "progressive"] },
  { id: "david-pakman", name: "David Pakman", slug: "david-pakman", platforms: ["youtube", "podcast"], currentLeaning: "left", description: "Progressive political commentator and podcast host.", knownFor: ["The David Pakman Show"], tags: ["youtube", "podcast", "progressive"] },
  { id: "kyle-kulinski", name: "Kyle Kulinski", slug: "kyle-kulinski", platforms: ["youtube"], currentLeaning: "left", description: "Progressive commentator. Co-founded Justice Democrats with Cenk Uygur.", knownFor: ["Secular Talk", "Justice Democrats"], tags: ["youtube", "progressive"] },
  { id: "sam-seder", name: "Sam Seder", slug: "sam-seder", platforms: ["youtube", "podcast"], currentLeaning: "left", description: "Progressive political commentator and podcast host.", knownFor: ["The Majority Report"], tags: ["youtube", "podcast", "progressive"] },
  { id: "destiny", name: "Destiny (Steven Bonnell)", slug: "destiny", platforms: ["youtube", "streaming"], currentLeaning: "center-left", description: "Political streamer and debater. Known for extensive online political debates.", knownFor: ["Destiny", "Political debates"], tags: ["streaming", "debate", "independent"] },
  { id: "brian-tyler-cohen", name: "Brian Tyler Cohen", slug: "brian-tyler-cohen", platforms: ["youtube"], currentLeaning: "left", description: "Progressive political commentator. One of the most-viewed independent progressive hosts on YouTube.", knownFor: ["YouTube commentary", "No Lie with Brian Tyler Cohen"], tags: ["youtube", "progressive"] },
  { id: "meidas-touch", name: "MeidasTouch (Ben Meiselas)", slug: "meidas-touch", platforms: ["youtube", "podcast"], currentLeaning: "left", description: "Progressive media network. Fastest-growing political YouTube channel in 2025.", knownFor: ["MeidasTouch Network", "Legal AF"], tags: ["youtube", "progressive", "network"] },
  { id: "jon-stewart", name: "Jon Stewart", slug: "jon-stewart", platforms: ["cable-news", "youtube", "podcast"], currentLeaning: "center-left", description: "The Daily Show host (intermittent). Hugely influential satirist and political commentator.", knownFor: ["The Daily Show", "Comedy Central"], tags: ["comedy", "satire", "influential"] },
  { id: "john-oliver", name: "John Oliver", slug: "john-oliver", platforms: ["cable-news", "youtube"], currentLeaning: "left", description: "HBO host of Last Week Tonight. Known for deep-dive investigative comedy segments.", knownFor: ["Last Week Tonight", "HBO"], tags: ["hbo", "comedy", "investigative"] },
  { id: "pod-save-america", name: "Pod Save America", slug: "pod-save-america", platforms: ["podcast", "youtube"], currentLeaning: "left", description: "Progressive political podcast by former Obama staffers Jon Favreau, Jon Lovett, and Tommy Vietor.", knownFor: ["Pod Save America", "Crooked Media"], tags: ["podcast", "progressive", "crooked-media"] },
  { id: "mehdi-hasan", name: "Mehdi Hasan", slug: "mehdi-hasan", platforms: ["youtube", "podcast"], currentLeaning: "left", description: "Progressive journalist. Founded Zeteo after leaving MSNBC. Known for aggressive interview style.", knownFor: ["Zeteo", "MSNBC"], tags: ["youtube", "podcast", "progressive"] },
  { id: "chris-cuomo", name: "Chris Cuomo", slug: "chris-cuomo", platforms: ["cable-news", "youtube"], currentLeaning: "center-left", description: "NewsNation host. Formerly CNN primetime anchor.", knownFor: ["Cuomo", "NewsNation", "CNN"], tags: ["cable-news", "newsnation"] },
  // Independent / Heterodox
  { id: "joe-rogan", name: "Joe Rogan", slug: "joe-rogan", platforms: ["podcast", "youtube"], currentLeaning: "center", description: "Host of the world's most popular podcast. Long-form interviews spanning politics, science, comedy, and culture.", knownFor: ["The Joe Rogan Experience", "Spotify"], tags: ["podcast", "independent", "long-form"], externalLinks: [{ platform: "youtube", url: "https://youtube.com/@joerogan" }] },
  { id: "lex-fridman", name: "Lex Fridman", slug: "lex-fridman", platforms: ["youtube", "podcast"], currentLeaning: "center", description: "AI researcher and long-form interviewer. Interviews span politics, science, philosophy.", knownFor: ["Lex Fridman Podcast"], tags: ["podcast", "long-form", "independent"], externalLinks: [{ platform: "youtube", url: "https://youtube.com/@lexfridman" }] },
  { id: "russell-brand", name: "Russell Brand", slug: "russell-brand", platforms: ["youtube"], currentLeaning: "unclassified", description: "Comedian turned political commentator. Controversial shift from left to anti-establishment right-coded content.", knownFor: ["Stay Free", "YouTube"], tags: ["youtube", "controversial", "anti-establishment"] },
  { id: "patrick-bet-david", name: "Patrick Bet-David", slug: "patrick-bet-david", platforms: ["youtube", "podcast"], currentLeaning: "center-right", description: "Entrepreneur and political interviewer. Valuetainment media company.", knownFor: ["Valuetainment", "PBD Podcast"], tags: ["youtube", "podcast", "business"] },
  { id: "matt-taibbi", name: "Matt Taibbi", slug: "matt-taibbi", platforms: ["substack"], currentLeaning: "center", description: "Independent journalist on Substack. Known for Twitter Files reporting. Former Rolling Stone writer.", knownFor: ["Racket News", "Twitter Files", "Rolling Stone"], tags: ["substack", "journalist", "independent"] },
  { id: "glenn-greenwald", name: "Glenn Greenwald", slug: "glenn-greenwald", platforms: ["substack", "youtube"], currentLeaning: "center", description: "Independent journalist. Co-founded The Intercept. Known for Snowden reporting and anti-establishment stance.", knownFor: ["System Update", "The Intercept", "Snowden"], tags: ["substack", "journalist", "independent"] },
  { id: "bari-weiss", name: "Bari Weiss", slug: "bari-weiss", platforms: ["substack"], currentLeaning: "center", description: "Founder of The Free Press. Former NYT opinion editor. Heterodox media voice.", knownFor: ["The Free Press", "NYT"], tags: ["substack", "journalist", "heterodox"] },
  { id: "chris-hedges", name: "Chris Hedges", slug: "chris-hedges", platforms: ["youtube", "substack"], currentLeaning: "left", description: "Journalist, author, and former NYT foreign correspondent. Anti-war, anti-corporate perspective.", knownFor: ["The Chris Hedges Report", "Pulitzer Prize"], tags: ["journalist", "anti-war", "author"] },
  { id: "jimmy-dore", name: "Jimmy Dore", slug: "jimmy-dore", platforms: ["youtube"], currentLeaning: "unclassified", description: "Comedian and political commentator. Anti-establishment left who frequently criticizes Democrats.", knownFor: ["The Jimmy Dore Show"], tags: ["youtube", "anti-establishment"] },
  { id: "sam-harris", name: "Sam Harris", slug: "sam-harris", platforms: ["podcast"], currentLeaning: "center-left", description: "Neuroscientist and podcaster. Focuses on reason, science, free speech, and critiques of religion.", knownFor: ["Making Sense podcast", "Waking Up"], tags: ["podcast", "intellectual", "atheism"] },
  { id: "coleman-hughes", name: "Coleman Hughes", slug: "coleman-hughes", platforms: ["podcast", "youtube", "substack"], currentLeaning: "center", description: "Writer and podcaster. Focuses on race, public policy, and philosophy from a heterodox perspective.", knownFor: ["Conversations with Coleman"], tags: ["podcast", "substack", "heterodox"] },
  { id: "matt-yglesias", name: "Matt Yglesias", slug: "matt-yglesias", platforms: ["substack"], currentLeaning: "center-left", description: "Journalist and Substack writer. Co-founded Vox. Center-left policy wonk perspective.", knownFor: ["Slow Boring", "Vox"], tags: ["substack", "journalist", "policy"] },
  { id: "nate-silver", name: "Nate Silver", slug: "nate-silver", platforms: ["substack"], currentLeaning: "center", description: "Statistician and election forecaster. Founded FiveThirtyEight. Now on Substack.", knownFor: ["Silver Bulletin", "FiveThirtyEight"], tags: ["substack", "data", "forecasting"] },
  { id: "ezra-klein", name: "Ezra Klein", slug: "ezra-klein", platforms: ["podcast"], currentLeaning: "center-left", description: "NYT opinion columnist and podcaster. Co-founded Vox. Long-form policy interviews.", knownFor: ["The Ezra Klein Show", "NYT", "Vox"], tags: ["podcast", "nyt", "policy"] },
];

// ─── Print / Digital Journalists (30) ───────────────────────────────

const JOURNALISTS: PunditSeed[] = [
  { id: "thomas-friedman", name: "Thomas Friedman", slug: "thomas-friedman", platforms: ["newspaper"], currentLeaning: "center-left", description: "NYT columnist. Three-time Pulitzer Prize winner. Focuses on foreign affairs and globalization.", knownFor: ["NYT", "The World Is Flat"], tags: ["nyt", "columnist", "foreign-affairs"] },
  { id: "paul-krugman", name: "Paul Krugman", slug: "paul-krugman", platforms: ["newspaper", "substack"], currentLeaning: "left", description: "Nobel laureate economist. Former NYT columnist (retired 2024). Progressive economic perspective.", knownFor: ["NYT", "Nobel Prize Economics"], tags: ["nyt", "economist", "columnist"] },
  { id: "maureen-dowd", name: "Maureen Dowd", slug: "maureen-dowd", platforms: ["newspaper"], currentLeaning: "center-left", description: "NYT columnist. Known for sharp, personal political commentary.", knownFor: ["NYT"], tags: ["nyt", "columnist"] },
  { id: "david-brooks", name: "David Brooks", slug: "david-brooks", platforms: ["newspaper", "cable-news"], currentLeaning: "center-right", description: "NYT columnist and PBS commentator. Conservative voice in liberal media.", knownFor: ["NYT", "PBS NewsHour"], tags: ["nyt", "columnist", "moderate-conservative"] },
  { id: "ross-douthat", name: "Ross Douthat", slug: "ross-douthat", platforms: ["newspaper"], currentLeaning: "center-right", description: "NYT columnist. Catholic conservative intellectual perspective.", knownFor: ["NYT"], tags: ["nyt", "columnist", "conservative"] },
  { id: "bret-stephens", name: "Bret Stephens", slug: "bret-stephens", platforms: ["newspaper"], currentLeaning: "center-right", description: "NYT columnist. Former WSJ columnist. Neoconservative perspective.", knownFor: ["NYT", "WSJ"], tags: ["nyt", "columnist", "neoconservative"] },
  { id: "michelle-goldberg", name: "Michelle Goldberg", slug: "michelle-goldberg", platforms: ["newspaper"], currentLeaning: "left", description: "NYT columnist. Progressive perspective on politics and gender.", knownFor: ["NYT"], tags: ["nyt", "columnist", "progressive"] },
  { id: "peggy-noonan", name: "Peggy Noonan", slug: "peggy-noonan", platforms: ["newspaper"], currentLeaning: "center-right", description: "WSJ columnist. Former Reagan speechwriter.", knownFor: ["WSJ", "Reagan speechwriter"], tags: ["wsj", "columnist", "conservative"] },
  { id: "ben-domenech", name: "Ben Domenech", slug: "ben-domenech", platforms: ["podcast", "substack"], currentLeaning: "right", description: "The Federalist co-founder. Conservative media figure.", knownFor: ["The Federalist", "The Transom"], tags: ["conservative", "media-founder"] },
  { id: "mollie-hemingway", name: "Mollie Hemingway", slug: "mollie-hemingway", platforms: ["cable-news"], currentLeaning: "right", description: "The Federalist editor-in-chief. Fox News contributor.", knownFor: ["The Federalist", "Fox News"], tags: ["conservative", "fox-news"] },
  { id: "maggie-haberman", name: "Maggie Haberman", slug: "maggie-haberman", platforms: ["newspaper"], currentLeaning: "center", description: "NYT White House correspondent. Premier Trump beat reporter.", knownFor: ["NYT", "Confidence Man"], tags: ["nyt", "reporter", "white-house"] },
  { id: "ryan-grim", name: "Ryan Grim", slug: "ryan-grim", platforms: ["youtube", "substack"], currentLeaning: "left", description: "Independent journalist. Formerly of The Intercept. Progressive investigative reporter.", knownFor: ["Drop Site News", "The Intercept"], tags: ["journalist", "progressive", "investigative"] },
  { id: "michael-shellenberger", name: "Michael Shellenberger", slug: "michael-shellenberger", platforms: ["substack"], currentLeaning: "center", description: "Independent journalist on Substack. Involved in Twitter Files. Focuses on tech and environment.", knownFor: ["Public", "Twitter Files"], tags: ["substack", "journalist", "independent"] },
  { id: "andrew-sullivan", name: "Andrew Sullivan", slug: "andrew-sullivan", platforms: ["substack"], currentLeaning: "center", description: "Veteran political writer. Conservative-leaning but heterodox. Former New Republic editor.", knownFor: ["The Weekly Dish", "The New Republic"], tags: ["substack", "journalist", "heterodox"] },
  { id: "ann-coulter", name: "Ann Coulter", slug: "ann-coulter", platforms: ["podcast", "substack"], currentLeaning: "right", description: "Conservative author and commentator. Known for provocative style.", knownFor: ["Books", "Commentary"], tags: ["conservative", "author", "provocative"] },
  { id: "jonah-goldberg", name: "Jonah Goldberg", slug: "jonah-goldberg", platforms: ["podcast", "substack"], currentLeaning: "center-right", description: "The Dispatch co-founder. Former National Review writer. Never-Trump conservative.", knownFor: ["The Dispatch", "The Remnant podcast"], tags: ["conservative", "never-trump"] },
  { id: "david-french", name: "David French", slug: "david-french", platforms: ["newspaper"], currentLeaning: "center-right", description: "NYT columnist. Evangelical Christian, Never-Trump conservative perspective.", knownFor: ["NYT", "The Dispatch"], tags: ["nyt", "columnist", "never-trump"] },
  { id: "steve-bannon", name: "Steve Bannon", slug: "steve-bannon", platforms: ["podcast", "streaming"], currentLeaning: "far-right", description: "War Room podcast host. Former Trump White House strategist and Breitbart chairman.", knownFor: ["War Room", "Breitbart", "Trump White House"], tags: ["podcast", "far-right", "political-strategist"] },
  { id: "alex-jones", name: "Alex Jones", slug: "alex-jones", platforms: ["streaming", "podcast"], currentLeaning: "far-right", description: "Infowars founder. Largely deplatformed but still influential. Known for conspiracy theories.", knownFor: ["Infowars"], tags: ["streaming", "conspiracy", "deplatformed"] },
];

// ─── Political Figures as Media (20) ────────────────────────────────

const POLITICAL_FIGURES: PunditSeed[] = [
  { id: "donald-trump", name: "Donald Trump", slug: "donald-trump", platforms: ["other"], currentLeaning: "right", description: "45th and 47th President. Truth Social presence. Functions as a media figure as much as a politician.", knownFor: ["Truth Social", "President"], tags: ["politician", "president", "media-figure"] },
  { id: "aoc", name: "Alexandria Ocasio-Cortez", slug: "aoc", platforms: ["youtube", "twitter"], currentLeaning: "left", description: "U.S. Representative. One of the most-followed politicians on social media. Progressive standard-bearer.", knownFor: ["Congress", "Instagram", "Progressive politics"], tags: ["politician", "progressive", "social-media"] },
  { id: "bernie-sanders", name: "Bernie Sanders", slug: "bernie-sanders", platforms: ["youtube"], currentLeaning: "left", description: "U.S. Senator. Democratic socialist. Major YouTube presence with political commentary.", knownFor: ["Senate", "Presidential campaigns", "YouTube"], tags: ["politician", "democratic-socialist", "youtube"] },
  { id: "ted-cruz", name: "Ted Cruz", slug: "ted-cruz", platforms: ["podcast"], currentLeaning: "right", description: "U.S. Senator. Verdict podcast host. Conservative firebrand.", knownFor: ["Senate", "Verdict podcast"], tags: ["politician", "conservative", "podcast"] },
  { id: "vivek-ramaswamy", name: "Vivek Ramaswamy", slug: "vivek-ramaswamy", platforms: ["podcast", "youtube"], currentLeaning: "right", description: "Entrepreneur and political figure. Frequent media appearances. Anti-woke corporate activism.", knownFor: ["Presidential campaign", "DOGE"], tags: ["politician", "entrepreneur", "media-figure"] },
  { id: "tulsi-gabbard", name: "Tulsi Gabbard", slug: "tulsi-gabbard", platforms: ["podcast", "cable-news"], currentLeaning: "center-right", description: "Former Democratic congresswoman who shifted right. Now Trump administration DNI.", knownFor: ["Congress", "Presidential campaign", "Party switch"], tags: ["politician", "party-switch"] },
  { id: "rfk-jr", name: "RFK Jr.", slug: "rfk-jr", platforms: ["podcast", "youtube"], currentLeaning: "unclassified", description: "HHS Secretary. Anti-establishment figure. Shifted from Democrat to independent to Trump ally.", knownFor: ["HHS", "Presidential campaign", "Anti-vaccine advocacy"], tags: ["politician", "hhs", "anti-establishment"] },
  { id: "marjorie-taylor-greene", name: "Marjorie Taylor Greene", slug: "marjorie-taylor-greene", platforms: ["other"], currentLeaning: "far-right", description: "U.S. Representative. Heavy social media presence. Controversial statements and conspiracy promotion.", knownFor: ["Congress", "Social media"], tags: ["politician", "far-right", "social-media"] },
  { id: "ilhan-omar", name: "Ilhan Omar", slug: "ilhan-omar", platforms: ["other"], currentLeaning: "left", description: "U.S. Representative. Progressive Squad member. Controversial foreign policy positions.", knownFor: ["Congress", "The Squad"], tags: ["politician", "progressive"] },
  { id: "jd-vance", name: "JD Vance", slug: "jd-vance", platforms: ["other"], currentLeaning: "right", description: "Vice President. Author of Hillbilly Elegy. Populist right perspective.", knownFor: ["Vice President", "Hillbilly Elegy"], tags: ["politician", "vp", "populist"] },
];

// ─── Additional Media Organizations (beyond the 5 already seeded) ───

const ORGANIZATIONS: PunditSeed[] = [
  { id: "abc-news", name: "ABC News", slug: "abc-news", platforms: ["cable-news", "youtube"], currentLeaning: "center-left", description: "Major broadcast news network.", knownFor: ["World News Tonight", "Good Morning America"], tags: ["broadcast", "organization", "mainstream-media"] },
  { id: "nbc-news", name: "NBC News", slug: "nbc-news", platforms: ["cable-news", "youtube"], currentLeaning: "center-left", description: "Major broadcast news network.", knownFor: ["Nightly News", "Meet the Press", "TODAY"], tags: ["broadcast", "organization", "mainstream-media"] },
  { id: "cbs-news", name: "CBS News", slug: "cbs-news", platforms: ["cable-news", "youtube"], currentLeaning: "center-left", description: "Major broadcast news network.", knownFor: ["CBS Evening News", "60 Minutes", "Face the Nation"], tags: ["broadcast", "organization", "mainstream-media"] },
  { id: "newsnation", name: "NewsNation", slug: "newsnation", platforms: ["cable-news"], currentLeaning: "center", description: "Growing cable news network positioning itself as centrist alternative.", knownFor: ["NewsNation"], tags: ["cable-news", "organization", "centrist"] },
  { id: "newsmax", name: "Newsmax", slug: "newsmax", platforms: ["cable-news", "youtube"], currentLeaning: "right", description: "Right-leaning cable news network. Grew significantly post-2020.", knownFor: ["Newsmax TV"], tags: ["cable-news", "organization", "conservative"] },
  { id: "oan", name: "OAN", slug: "oan", platforms: ["cable-news"], currentLeaning: "far-right", description: "One America News Network. Far-right cable news.", knownFor: ["OAN"], tags: ["cable-news", "organization", "far-right"] },
  { id: "c-span", name: "C-SPAN", slug: "c-span", platforms: ["cable-news", "youtube"], currentLeaning: "center", description: "Non-partisan coverage of government proceedings.", knownFor: ["C-SPAN", "Congressional coverage"], tags: ["cable-news", "organization", "non-partisan"] },
  { id: "washington-post", name: "The Washington Post", slug: "washington-post", platforms: ["newspaper", "youtube"], currentLeaning: "center-left", description: "Major national newspaper. Owned by Jeff Bezos.", knownFor: ["Democracy Dies in Darkness", "Watergate"], tags: ["newspaper", "organization", "mainstream-media"] },
  { id: "wsj", name: "The Wall Street Journal", slug: "wsj", platforms: ["newspaper", "youtube"], currentLeaning: "center-right", description: "Major financial newspaper with conservative editorial page and centrist news reporting.", knownFor: ["WSJ", "Financial news"], tags: ["newspaper", "organization", "financial"] },
  { id: "usa-today", name: "USA Today", slug: "usa-today", platforms: ["newspaper"], currentLeaning: "center", description: "Mass-market national newspaper.", knownFor: ["USA Today"], tags: ["newspaper", "organization"] },
  { id: "ap-news", name: "Associated Press", slug: "ap-news", platforms: ["other"], currentLeaning: "center", description: "Wire service. Primary news source for other outlets. Non-profit cooperative.", knownFor: ["AP", "Wire service"], tags: ["wire-service", "organization", "non-profit"] },
  { id: "reuters", name: "Reuters", slug: "reuters", platforms: ["other"], currentLeaning: "center", description: "International wire service. Known for factual reporting.", knownFor: ["Reuters", "Wire service"], tags: ["wire-service", "organization", "international"] },
  { id: "politico", name: "Politico", slug: "politico", platforms: ["other"], currentLeaning: "center-left", description: "Political news outlet focused on Capitol Hill and policy.", knownFor: ["Politico", "Playbook"], tags: ["digital", "organization", "politics"] },
  { id: "the-hill", name: "The Hill", slug: "the-hill", platforms: ["other", "youtube"], currentLeaning: "center", description: "Capitol Hill focused political news. Rising show launched Breaking Points hosts.", knownFor: ["The Hill", "Rising"], tags: ["digital", "organization", "politics"] },
  { id: "axios", name: "Axios", slug: "axios", platforms: ["other"], currentLeaning: "center", description: "Digital media company focused on business, politics, tech. Known for brevity.", knownFor: ["Axios", "Smart Brevity"], tags: ["digital", "organization"] },
  { id: "vox", name: "Vox", slug: "vox", platforms: ["other", "youtube"], currentLeaning: "left", description: "Explanatory journalism outlet. Progressive editorial perspective.", knownFor: ["Vox", "Vox Explainers"], tags: ["digital", "organization", "progressive"] },
  { id: "huffpost", name: "HuffPost", slug: "huffpost", platforms: ["other"], currentLeaning: "left", description: "Left-leaning digital news. Founded by Arianna Huffington.", knownFor: ["HuffPost"], tags: ["digital", "organization", "progressive"] },
  { id: "daily-caller", name: "The Daily Caller", slug: "daily-caller", platforms: ["other", "youtube"], currentLeaning: "right", description: "Right-leaning digital news. Founded by Tucker Carlson.", knownFor: ["The Daily Caller"], tags: ["digital", "organization", "conservative"] },
  { id: "the-intercept", name: "The Intercept", slug: "the-intercept", platforms: ["other"], currentLeaning: "left", description: "Investigative journalism outlet. Founded by Glenn Greenwald, Laura Poitras, Jeremy Scahill.", knownFor: ["The Intercept", "Investigative journalism"], tags: ["digital", "organization", "investigative"] },
  { id: "the-federalist", name: "The Federalist", slug: "the-federalist", platforms: ["other"], currentLeaning: "right", description: "Conservative online magazine.", knownFor: ["The Federalist"], tags: ["digital", "organization", "conservative"] },
  { id: "national-review", name: "National Review", slug: "national-review", platforms: ["other", "podcast"], currentLeaning: "right", description: "Conservative magazine founded by William F. Buckley Jr.", knownFor: ["National Review"], tags: ["magazine", "organization", "conservative"] },
  { id: "the-atlantic", name: "The Atlantic", slug: "the-atlantic", platforms: ["other"], currentLeaning: "center-left", description: "Center-left longform magazine. Founded 1857.", knownFor: ["The Atlantic"], tags: ["magazine", "organization", "longform"] },
  { id: "daily-wire", name: "Daily Wire", slug: "daily-wire", platforms: ["youtube", "streaming"], currentLeaning: "right", description: "Conservative media company founded by Ben Shapiro. Multiple shows and hosts.", knownFor: ["Daily Wire", "Ben Shapiro", "Matt Walsh"], tags: ["streaming", "organization", "conservative"] },
  { id: "tyt-network", name: "The Young Turks (Network)", slug: "tyt-network", platforms: ["youtube", "streaming"], currentLeaning: "left", description: "Progressive media network. One of the largest online news shows.", knownFor: ["TYT", "Progressive media"], tags: ["youtube", "organization", "progressive"] },
  { id: "meidas-touch-network", name: "MeidasTouch Network", slug: "meidas-touch-network", platforms: ["youtube", "podcast"], currentLeaning: "left", description: "Progressive media network. Fastest-growing political YouTube channel in 2025.", knownFor: ["MeidasTouch"], tags: ["youtube", "organization", "progressive"] },
  { id: "blaze-tv", name: "BlazeTV", slug: "blaze-tv", platforms: ["streaming"], currentLeaning: "right", description: "Conservative media network founded by Glenn Beck.", knownFor: ["BlazeTV"], tags: ["streaming", "organization", "conservative"] },
  { id: "the-free-press", name: "The Free Press", slug: "the-free-press", platforms: ["substack"], currentLeaning: "center", description: "Heterodox media outlet founded by Bari Weiss.", knownFor: ["The Free Press", "Honestly podcast"], tags: ["substack", "organization", "heterodox"] },
  { id: "crooked-media", name: "Crooked Media", slug: "crooked-media", platforms: ["podcast"], currentLeaning: "left", description: "Progressive media company. Pod Save America and other podcasts.", knownFor: ["Pod Save America", "Crooked Media"], tags: ["podcast", "organization", "progressive"] },
  { id: "npr", name: "NPR", slug: "npr", platforms: ["other", "podcast"], currentLeaning: "center-left", description: "National Public Radio. Public media with extensive news programming.", knownFor: ["NPR", "Morning Edition", "All Things Considered"], tags: ["radio", "organization", "public-media"] },
  { id: "pbs", name: "PBS NewsHour", slug: "pbs", platforms: ["cable-news", "youtube"], currentLeaning: "center", description: "Public television news. Known for in-depth, measured coverage.", knownFor: ["PBS NewsHour"], tags: ["television", "organization", "public-media"] },
  { id: "bbc-news", name: "BBC News", slug: "bbc-news", platforms: ["other", "youtube"], currentLeaning: "center", description: "British public broadcaster. Extensive US political coverage.", knownFor: ["BBC News", "BBC World Service"], tags: ["international", "organization", "public-media"] },
  { id: "propublica", name: "ProPublica", slug: "propublica", platforms: ["other"], currentLeaning: "center-left", description: "Investigative nonprofit journalism organization.", knownFor: ["ProPublica", "Investigative journalism"], tags: ["nonprofit", "organization", "investigative"] },
  { id: "reason", name: "Reason", slug: "reason", platforms: ["other", "youtube", "podcast"], currentLeaning: "center-right", description: "Libertarian magazine and media outlet.", knownFor: ["Reason", "Libertarian perspective"], tags: ["magazine", "organization", "libertarian"] },
];

async function seedExtended() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  const allPundits = [
    ...CABLE_NEWS,
    ...YOUTUBE_PODCAST,
    ...JOURNALISTS,
    ...POLITICAL_FIGURES,
    ...ORGANIZATIONS,
  ];

  // Filter out any that already exist in the original seed
  const existingIds = [
    "philip-defranco", "rachel-maddow", "don-lemon", "tim-pool",
    "breaking-points", "tucker-carlson", "candace-owens", "nick-fuentes",
    "ben-shapiro", "cnn", "fox-news", "msnbc", "nyt",
  ];

  const newPundits = allPundits.filter((p) => !existingIds.includes(p.id));

  console.log(`Seeding ${newPundits.length} new pundits/organizations...\n`);

  let count = 0;
  for (const pundit of newPundits) {
    try {
      await db
        .insert(schema.pundits)
        .values({
          id: pundit.id,
          name: pundit.name,
          slug: pundit.slug,
          platforms: pundit.platforms,
          currentLeaning: pundit.currentLeaning,
          description: pundit.description,
          knownFor: pundit.knownFor,
          externalLinks: pundit.externalLinks ?? [],
          tags: pundit.tags,
        })
        .onConflictDoNothing();
      count++;
    } catch (err) {
      console.error(`  Failed: ${pundit.name}`, err);
    }
  }

  console.log(`  Done. ${count} pundits inserted.\n`);
  console.log("Extended seed complete.");
  await client.end();
  process.exit(0);
}

seedExtended().catch((err) => {
  console.error("Extended seed failed:", err);
  process.exit(1);
});
