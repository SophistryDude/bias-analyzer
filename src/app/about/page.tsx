import Link from "next/link";
import Header from "../../components/Header";

export const metadata = {
  title: "About & Methodology — MediaSentinel",
  description:
    "How MediaSentinel analyzes media: multi-axis political model, rule-engine-first detection, omission-over-fabrication, and epistemological classification.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-4 text-white">{title}</h2>
      <div className="space-y-4 text-gray-300 leading-relaxed">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-3">About & Methodology</h1>
        <p className="text-gray-400 mb-10">
          What MediaSentinel measures, how it measures it, and why the
          measurements are structured the way they are.
        </p>

        <Section title="What this is">
          <p>
            MediaSentinel is a media analysis system. You give it an article,
            transcript, or URL; it returns a structured assessment of the
            logical fallacies, reframing techniques, political bias, and
            epistemological claims present in the text. The goal is not to
            label content as &ldquo;true&rdquo; or &ldquo;false&rdquo; — it is to
            make the rhetorical and editorial structure of a piece visible, so
            you can evaluate it yourself.
          </p>
          <p>
            The system is free to use and the methodology is fully transparent.
            Every detection rule is auditable. Every blog post is a direct
            readout of the underlying data. There is no editorial layer on top
            of the analysis.
          </p>
        </Section>

        <Section title="The multi-axis political model">
          <p>
            Most bias trackers collapse politics to a single left-right
            spectrum. That is almost always misleading. A libertarian and a
            progressive both score as &ldquo;anti-establishment&rdquo; on a
            one-dimensional axis, but they disagree on nearly every policy
            question. A populist right and a traditional conservative look
            identical on a red/blue scale, but they advocate incompatible
            programs.
          </p>
          <p>MediaSentinel uses nine independent axes:</p>
          <ol className="list-decimal pl-6 space-y-3">
            <li>
              <strong className="text-white">Economic</strong> — capitalist ↔
              communist. Who owns the means of production and how resources
              are allocated.
            </li>
            <li>
              <strong className="text-white">Speech</strong> — free-speech
              absolutist ↔ reasonable censorship. Scored against{" "}
              <em>how the specific content being analyzed treats speech</em>,
              not against a standing ideological position (people rarely hold
              stable positions on this).
            </li>
            <li>
              <strong className="text-white">Causation Analysis</strong> —
              structural ↔ individual. When the content explains an outcome,
              which frame does it reach for? Structural reasoning is not
              inherently left and individual reasoning is not inherently
              right. A right-populist attack on &ldquo;globalist elites&rdquo; is
              structural. A progressive framing of a specific crime as
              personal culpability is individual.
            </li>
            <li>
              <strong className="text-white">Equality Model</strong> — outcome
              equality ↔ opportunity equality. When the content invokes
              fairness, which model of fairness is it using? A classical
              liberal can favor outcome equality in specific domains
              (healthcare, K-12) while favoring opportunity equality
              elsewhere — that&rsquo;s a legitimate mid-axis profile.
            </li>
            <li>
              <strong className="text-white">Liberal / Conservative</strong> —
              change tolerance. Liberal: maximize equality and freedom by
              changing systems that produce unequal outcomes. Conservative:
              preserve the status quo of the previous 1-2 generations; the
              burden of proof is on those proposing change. This axis measures{" "}
              <em>pace and risk tolerance</em>, not direction.
            </li>
            <li>
              <strong className="text-white">Foreign Policy</strong> —
              isolationist ↔ interventionist. Cuts across left/right. Bernie
              Sanders and Rand Paul are both isolationists. Hillary Clinton
              and Lindsey Graham are both interventionists.
            </li>
            <li>
              <strong className="text-white">Populism</strong> — populist ↔
              institutionalist. Does the content treat &ldquo;the people&rdquo;
              as the legitimate source of authority and portray institutions
              (media, academia, agencies, courts) as corrupt or captured? Or
              does it treat institutions as legitimate custodians of
              expertise? Tucker Carlson and Krystal Ball are both populists.
              Bill Kristol and Rachel Maddow are both institutionalists.
            </li>
            <li>
              <strong className="text-white">Nationalism</strong> — nationalist
              ↔ globalist. Is the nation-state the primary unit of obligation
              and analysis, or are cross-national institutions and
              universalist obligations legitimate constraints on national
              decision-making? Distinct from foreign policy: a nationalist can
              be either isolationist (paleoconservative) or interventionist
              (neoconservative), and the same split exists on the globalist
              side.
            </li>
            <li>
              <strong className="text-white">Authority</strong> — libertarian
              ↔ authoritarian. How much power should the state or institutions
              have over individual behavior? This is the vertical axis of the
              classic political compass, and it is{" "}
              <em>separate from economic freedom</em>. A progressive can be
              libertarian on speech and sexuality while being interventionist
              on commerce. Most people are selectively libertarian or
              authoritarian depending on the domain.
            </li>
          </ol>
          <p>
            These nine axes are independent. A person can be a capitalist,
            structural-causation, outcome-equality, liberal, isolationist,
            populist, nationalist libertarian — that&rsquo;s a real profile
            held by real people, and no single left-right label captures it.
            When a pundit &ldquo;moves right,&rdquo; the question is{" "}
            <em>which axis</em>, and that matters more than the direction.
          </p>
          <p className="text-sm text-gray-500 border-l-2 border-gray-700 pl-4 mt-6">
            <strong className="text-gray-400">Methodology note.</strong> An
            earlier version used five axes with a single &ldquo;progressive&rdquo;
            axis doing the work of both causation analysis and equality
            model. That axis measured <em>engagement with a particular
            vocabulary</em> (&ldquo;systemic,&rdquo; &ldquo;equity,&rdquo;
            &ldquo;structural&rdquo;) rather than a neutral dimension — a
            right-leaning piece that rejected the vocabulary entirely would
            score &ldquo;non-progressive&rdquo; by default, which is really
            just measuring language overlap with the progressive left. The
            decomposition into causation-analysis and equality-model, and the
            addition of the populism / nationalism / authority axes, is an
            attempt to make the model legible and defensible to a critic from
            either side.
          </p>
        </Section>

        <Section title="Rule engine first, LLM second">
          <p>
            The fallacy detector, reframing detector, and epistemological
            classifier are <strong className="text-white">rule-based</strong>.
            They are collections of patterns, not neural networks. This is a
            deliberate architectural choice, not a technical limitation.
          </p>
          <p>Rule-based detection has three properties an LLM cannot match:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-white">Auditable.</strong> Every
              detection links to the specific rule that fired. If you disagree
              with a call, you can read the rule.
            </li>
            <li>
              <strong className="text-white">Reproducible.</strong> The same
              input always produces the same output. LLM outputs vary.
            </li>
            <li>
              <strong className="text-white">Free of the thing being
              measured.</strong> LLMs trained on human writing absorb human
              rhetorical patterns, including the ones we are trying to detect.
              Asking an LLM &ldquo;is this biased?&rdquo; produces an answer
              that is itself biased by its training data.
            </li>
          </ul>
          <p>
            The LLM layer runs after the rule engine. It adds things rules are
            bad at — tone and sentiment, structural fallacies that depend on
            pragmatic context, and refinement of claims the rule engine cannot
            classify. The LLM never overrides a rule; it supplements.
          </p>
          <p>
            This is the <em>hybrid pattern</em> and it is non-negotiable for
            new analysis features.
          </p>
        </Section>

        <Section title="Omission, not fabrication">
          <p>
            Most media bias is not lying. It is selection. Outlets very rarely
            invent facts — they choose which facts to include and which to
            leave out. The pattern of omissions reveals the framing more
            reliably than any individual word choice.
          </p>
          <p>
            For every story we track, MediaSentinel extracts the set of
            discrete factual claims from each outlet&rsquo;s coverage, merges
            them into a master claim list, and then compares each
            outlet&rsquo;s coverage back against the master list. The result is
            a{" "}
            <strong className="text-white">
              completeness score: what fraction of significant claims did this
              outlet include?
            </strong>
          </p>
          <p>
            The April 2016 Aleppo case study is the validated example.
            Mainstream left outlets covered an airstrike on Al Quds hospital in
            rebel-held Aleppo; they omitted rebel mortar attacks on
            government-held neighborhoods that killed civilians on the other
            side of the front line the same day. Right-leaning outlets covered
            Trump&rsquo;s &ldquo;America First&rdquo; speech at the Mayflower
            Hotel that day; they omitted the hospital strike entirely. No
            outlet lied. The shape of what each one left out is the story.
          </p>
          <p>
            <em>Reliability</em> is the long-run accumulation of these scores.
            It is not a separate judgment — it is simply &ldquo;of every claim
            that turned out to be significant across multiple sources, how
            often did this outlet include it?&rdquo;
          </p>
        </Section>

        <Section title="Epistemological classification">
          <p>
            The core bias insight, derived from the{" "}
            <Link
              href="/blog"
              className="text-red-400 hover:underline"
            >
              Logic System
            </Link>{" "}
            framework that underpins MediaSentinel:{" "}
            <strong className="text-white">
              bias is presenting tacit understanding as known truth
            </strong>
            . It is a category error — dressing one kind of claim as another.
          </p>
          <p>Claims come in several epistemological types:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-white">Verifiable observation</strong> —
              directly checkable against records.
            </li>
            <li>
              <strong className="text-white">Statistical claim</strong> —
              quantitative, methodology-dependent.
            </li>
            <li>
              <strong className="text-white">Causal claim</strong> — asserts
              causation, which may or may not be fundamental.
            </li>
            <li>
              <strong className="text-white">Model-dependent
              interpretation</strong> — true within a framework, not
              absolutely.
            </li>
            <li>
              <strong className="text-white">Tacit consensus</strong> —
              institutional or expert consensus inherited rather than proved.
            </li>
            <li>
              <strong className="text-white">Value judgment</strong> — a
              normative claim about what <em>should</em> be.
            </li>
          </ul>
          <p>
            Each of these is legitimate when labeled accurately. Bias occurs
            when one type is presented <em>as another</em> — a value judgment
            dressed as a verifiable observation (&ldquo;it is a fact
            that&hellip;&rdquo;), or a tacit consensus dressed as a causal
            claim. The classifier flags these disguises as category errors.
          </p>
        </Section>

        <Section title="What this is not">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-white">Not a truth oracle.</strong> We do
              not adjudicate whose reporting is correct. Divergent numbers from
              credible sources often reflect different methodologies, not
              lies.
            </li>
            <li>
              <strong className="text-white">Not a personality tracker.</strong>
              {" "}We do not profile pundits&rsquo; personalities, motives, or
              intentions. We analyze the rhetorical structure of the content
              they produce. Typing the performance is not typing the person.
            </li>
            <li>
              <strong className="text-white">Not a partisan tool.</strong> Every
              outlet&rsquo;s omission pattern is measured by the same
              procedure. Left, right, and center all get the same treatment.
            </li>
            <li>
              <strong className="text-white">Not LLM-reasoning dressed up as
              analysis.</strong> The logic engine would produce its findings
              whether the LLM layer existed or not. The LLM adds resolution; it
              is not the source of the judgment.
            </li>
          </ul>
        </Section>

        <Section title="Current limitations">
          <p>
            The system is under active development. As of this writing:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Pundit profiles currently on the site are first-pass hypotheses,
              not yet replaced by system-generated assessments. They are
              labeled accordingly and will be replaced.
            </li>
            <li>
              The epistemological classifier has partial rule coverage. Claims
              the rule engine cannot classify are deferred to the LLM
              refinement layer.
            </li>
            <li>
              Historical content coverage is being built out — early cases
              (Aleppo, 2016 election cycle) are in; the 20-year back-catalog
              is still being ingested.
            </li>
            <li>
              Paywalled sources (NYT, WaPo, WSJ) cannot be scraped directly.
              Coverage of those outlets comes through archival APIs, not live
              scraping.
            </li>
          </ul>
        </Section>

        <Section title="Try it">
          <p>
            Paste any article URL, YouTube link, or block of text on the{" "}
            <Link href="/analysis" className="text-red-400 hover:underline">
              Analyze
            </Link>{" "}
            page. You will get back a full breakdown: manipulation score,
            detected fallacies with the specific excerpts that triggered them,
            reframing techniques, bias leaning, balance score, and overall
            assessment. Every finding is tied to a rule and a piece of text.
            Nothing is hidden.
          </p>
        </Section>
      </main>

      <footer className="border-t border-gray-800 py-8 mt-8">
        <div className="max-w-3xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>MediaSentinel — Independent media analysis. No political allegiance.</p>
        </div>
      </footer>
    </div>
  );
}
