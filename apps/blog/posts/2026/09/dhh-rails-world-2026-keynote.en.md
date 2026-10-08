---
title: 'I Only Saw Why <em>Rails</em> Was Good After Its Creator Put the Pencil Down'
tags:
  - essay
  - oss
  - ai
published: false
date: 2026-09-28 10:49:47
description: "A former junior Rails developer at Kakao reflects on DHH's Rails World 2026 keynote. It traces the stages Rails grew up on and the path DHH has taken, and follows, from what he actually said, why his retirement from hand-written code left me uneasy, and what it left out for people still learning judgment."
art:
  undraw: informed-decision
  layout: bauhaus
  hue: slate
  tone: light
  hero: 'Provide sharp knives'
---

## Table of Contents

## When Kakao's Servers Ran on Rails

About ten years ago, when I worked at Kakao (the company behind KakaoTalk), most of its servers ran on Ruby on Rails (Rails from here on). It was already in use before I joined. As a junior developer, I never got as far as asking why Rails had been chosen. When people around me explained its strengths, I took their word for it, and I only vaguely knew that we were putting those strengths to use in our work.

It was pleasant to develop with and easy to use. Today I could list its strengths with all sorts of flourishes, but back then, if someone had asked me what was good about it, I doubt I could have given a proper answer. I knew it was good, but not why.

Much later, in an unexpected place, I found myself thinking about the reason again. On September 23, 2026, DHH (David Heinemeier Hansson), who created Rails, took the stage for the Rails World opening keynote and said he had stopped writing code by hand. Only after hearing that did I feel I understood a little of what Rails had given me.

## The Rails Stage, from RailsConf to Rails World

Before getting to the keynote, I want to briefly go over DHH and Rails, and RailsConf and Rails World.

Before Rails World there was RailsConf. Organized by [Ruby Central](https://rubycentral.org/about/), a nonprofit of the Ruby community, it was first held in Chicago in 2006. For years DHH gave the opening keynote. It was customary for the creator of Rails to open the event by talking about the road ahead.

2022 was different. The RailsConf program committee emailed DHH: "With you having been mostly offline the last year, the program committee has decided it would be valuable for the community to start sharing the opening keynote stage with other contributors." DHH published the email in full in [No RailsConf](https://world.hey.com/dhh/no-railsconf-faa7935e) and pushed back, lamenting a community "so sharply divided by politics and ideology that we can't even share the love of Ruby on Rails together at a conference without a need to settle scores." The "last year" here refers to 2021, the year of the Basecamp episode. I'll come back to that a little later.

In November of the same year, the [Rails Foundation](https://rubyonrails.org/2022/11/14/the-rails-foundation) launched. Eight founding members, including 37signals, Shopify, and GitHub, joined and raised $1 million. The foundation set out to help the Rails ecosystem through documentation, education, marketing, and events, and the following year it started holding Rails World.

The 650 tickets for the first Rails World, held in Amsterdam in 2023, [sold out in less than 45 minutes](https://world.hey.com/dhh/rails-world-sold-out-in-less-than-45-minutes-78a0b276). In 2024, Toronto drew [more than 1,000 people from 57 countries](https://rubyonrails.org/world/2024). In 2025 it went back to Amsterdam, and in 2026 it was held in Austin.

Meanwhile, RailsConf came to an end. Ruby Central [announced it was ending](https://rubycentral.org/news/announcing-railsconf-2025-and-a-new-chapter-for-ruby-central-events/), saying it would cut back to one event a year and invest more in open source infrastructure such as RubyGems. The July 2025 edition in Philadelphia was [the last RailsConf](https://rubyonrails.org/2025/5/29/final-railsconf). Its theme was "The Past, Present, and Future of Rails," and a fireside chat with DHH was on the program. Rails World is now the flagship event that carries the Rails name.

At Rails World, too, the opening keynote was DHH's. In 2023 he [unveiled](https://rubyonrails.org/2023/10/19/rails-world-2023-recap) seven tools for the "One Person Framework," including Kamal 1.0, Solid Cache, and Solid Queue, and Rails 7.1 came out the same day. In 2024 he presented the [Rails 8 beta](https://rubyonrails.org/2024/9/27/rails-8-beta1-no-paas-required), and in 2025 the [Rails 8.1 beta](https://rubyonrails.org/2025/9/15/rails-world-2025-recap) with new features. In 2025 he also installed Omarchy, his own development setup built on Arch Linux and Hyprland, on a laptop and immediately ran a Rails app on it. Whether through new versions or new tools, it was a stage for showing what more you could do with Rails.

The 2026 [session page](https://rubyonrails.org/world/2026/speakers/dhh) described it the same way: "Opening Keynote highlighting what's new in Rails, what's coming next, and where Rails is headed in the future." There was a separate slot for AI and the future of Ruby and Rails: the next day, Matz (Yukihiro Matsumoto), who created Ruby, and DHH were scheduled for a conversation.

## Who DHH Is

DHH released Rails in 2004. He extracted the framework from Basecamp while building it. He still works as co-owner and CTO of 37signals, the company behind Basecamp and HEY. The ideas he put into Rails are written down in [The Rails Doctrine](https://rubyonrails.org/doctrine). The first of its nine pillars is "Optimize for programmer happiness," followed by others such as "Convention over Configuration," "The menu is omakase," "Exalt beautiful code," and "Push up a big tent."

The strengths of Rails I heard about as a junior probably came from here. Follow the conventions and code structure doesn't vary much from person to person, and you can do quite a lot while writing little. It's also well suited to small teams building and running web services quickly. The phrase "One Person Framework" goes further, carrying the aim of letting a single person build and run an entire web application.

He has talked about these ideas consistently, but he has also drawn a lot of controversy.

### Debates That Grew Out of His Philosophy

His 2014 post [TDD is dead. Long live testing.](https://dhh.dk/2014/tdd-is-dead-long-live-testing.html) is one example. He declared "My name is David, and I do not write software test-first," criticizing the way test-first development (TDD) was pushed like a moral code. The debate grew big enough to lead to [public conversations](https://martinfowler.com/articles/is-tdd-dead/) with Kent Beck and Martin Fowler.

In 2020 he clashed with Apple. An update to HEY's iOS app was rejected because the app couldn't be used right after download and offered no in-app purchase. After a public fight, they [settled](https://techcrunch.com/2020/06/22/apple-approves-hey-bug-fix-update-after-basecamp-agrees-to-tweak-app-at-center-of-store-policy-spat/) on the app issuing a free, temporary 14-day address. In 2022 he said 37signals would [leave the cloud](https://world.hey.com/dhh/why-we-re-leaving-the-cloud-654b47e0), arguing that "renting computers is (mostly) a bad deal for medium-sized companies like ours with stable growth." In 2023 he merged a [PR](https://github.com/hotwired/turbo/pull/971) removing TypeScript from Turbo on the day it was opened. Contributors objected that there had been no prior discussion.

Even if you couldn't accept all of these positions, you could tell what he valued: keep things simple, depend less on big platforms, and leave behind code that people enjoy reading and writing. Whether or not you agreed, I think he was someone whose next move you could roughly predict.

### Controversies Around People and Politics

It didn't stop at technology. In 2021, employees left Basecamp (the company now called 37signals). Since around 2009, its customer support staff had kept a list of "funny" customer names, which included Asian and African names. In April 2021, two employees who had added names to it in the past posted apologies on the company's internal Basecamp. The discussion spread from the list itself to the company's diversity and inclusion practices ([Platformer](https://www.platformer.news/-how-basecamp-blew-up/)).

On April 26, CEO Jason Fried announced six [policies](https://world.hey.com/jason/changes-at-basecamp-7f32afc5). The first was "No more societal and political discussions on our company Basecamp account." The employee-led diversity, equity, and inclusion (DEI) committee was also to be disbanded. The same day, DHH defended the decision in [his own post](https://world.hey.com/dhh/basecamp-s-new-etiquette-regarding-societal-politics-at-work-b44bef69), arguing that "by trying to have the debates around such incredibly sensitive societal politics inside the company, we're setting ourselves up for strife, with little chance of actually changing anyone's mind."

Employees who disagreed read it differently. They had raised a problem that happened inside the company, and they saw even that being lumped in as "politics" and shut down. About a third of the roughly 57 employees took the buyout the company offered and [left](https://techcrunch.com/2021/04/30/basecamp-employees-quit-ceo-letter/).

On September 15, 2025, [As I Remember London](https://world.hey.com/dhh/as-i-remember-london-e7d38e64) went up. DHH wrote that "in 2000, more than sixty percent of the city were native Brits. By 2024, that had dropped to about a third," and conveyed a sentiment of being "unwilling to resign the rest of the country to the kind of demographic replacement that befell London over the last two decades." Critics called the post racist, arguing that "native Brits" effectively meant white people ([Jake Lazaroff](https://jakelazaroff.com/words/dhh-is-way-worse-than-i-thought/)). It also prompted an [open letter](https://github.com/Plan-Vert/open-letter) to the Rails Core team and the Ruby community. Citing the post, the letter asked them to "cut ties with DHH and his work from this point forward," "hard fork Rails and associated projects to a new name and development free from his influence," and "adopt a modern Code of Conduct with suitable community governance," and more than 300 people signed it. Defenders countered that "native" refers to ancestry and origin rather than race, and that the criticism read the post far too uncharitably ([Felipe Contreras](https://felipec.wordpress.com/2025/09/23/the-ruby-community-doesnt-have-a-dhh-problem/)).

On July 21, 2026, he wrote [Wolves, sheep, and gypsies](https://world.hey.com/dhh/wolves-sheep-and-gypsies-ba44af6a). It sets the growing number of wolves in Denmark, which prey on livestock, next to the encampments that appeared after Copenhagen allowed sleeping in its parks. Arguing that both are being left unchecked for ideological reasons, it ends: "When wolves get out of control, you shoot them. When gypsies take over public spaces, you deport them." "Gypsy" refers to the Roma, and the word is often regarded as a slur. Six days later came [I'm sorry, Dave](https://world.hey.com/dhh/i-m-sorry-dave-380ec27d): he had asked Claude to translate the earlier post into Italian, and Claude declined, saying it was "dehumanizing toward an ethnic group." DHH warned against AI companies setting the bounds of what can be said in the name of safety, and wrote that this is why open-weight models are needed. Critics responded that framing the refusal as censorship obscured the actual statement, the call to deport Roma people ([Kitzy](https://kitzy.com/blog/dave-you-should-be-sorry/)).

How to take these controversies will differ from person to person, and I don't intend to pass that judgment here. What follows about the keynote is based on what was said on stage that day.

## September 23, 2026, Austin

At the start of the 63-minute keynote, DHH described his own state of mind. Some might call it AI psychosis, he said, but he preferred "AI delirium" or "AI euphoria." He then spent nearly nine minutes on the history of photography: how, once photography arrived, portrait painters moved on to impressionism and cubism.

To him, November 24, 2025, the day Opus 4.5 came out, was "the Kodak Brownie of our era." The Kodak Brownie was the inexpensive camera released in 1900 that brought photography to the masses. Just as the Brownie lowered the barrier to photography, he saw Opus 4.5 as the turning point that let far more people build software. He hadn't been satisfied with AI the whole time, though. From February through May 2026 he was disappointed, but after using Fable 5 and Mythos in June, he was convinced.

A few weeks earlier, 37signals had decided to stop writing code by hand. Writing code by hand is now an exceptional state, he said, "like seeing a bug in Sentry" (the error tracking service). If someone is writing code by hand, it's a sign that the agent failed to do its job, and the fix goes into the agent side. He also asked the audience whether anyone was still writing material amounts of code by hand every week. About five people raised their hands.

HEY is leaving the web app behind too, he said. Work on six native apps had started a week earlier, and the backend is being rewritten in Rust, cutting CPU usage by 99% and memory by 95%. By a back-of-the-envelope calculation, he said, even HEY's peak traffic could probably be served by a single Raspberry Pi. Rust was "the ugliest programming language that has been invented in probably the last 40 years," yet great as long as he never had to look at it. He even counted not knowing any Rust at all as an advantage.

Rails wasn't entirely absent. The web is still the best way to reach users who won't bother installing anything, he said, and convention over configuration saves agents tokens too. But he soon moved on to say that Ruby made up only about 3% of his work this year. He had written 150,000 lines in August alone, and there was now a programming language he liked better than Ruby: English. In other words, asking in natural language had become more of a joy to him than coding directly in a programming language. He also revealed that he had already retired from being a professional programmer around March.

His claims grew stronger as the talk went on. Writing code by hand is already uneconomical at most companies, he said, and by the end of the year the same would be true for virtually all programmers and companies in every domain. Abstractions, too, make less sense in the age of agents than they used to. He also demanded that any app without a CLI get one by next Friday.

Omarchy had raised about $20 million, he said, and its install time was down to 35 seconds. Then came the calculator, writing app, video editor, and presentation tool he had built with agents. In the last few minutes he answered people who worry about AI: security can be prepared for, and economists can't predict the future anyway. Choose P(bloom), he said, over P(doom), the probability of catastrophe. He ended by saying the black pill is for losers: "Don't be a loser." The black pill is online slang for resigned, fatalistic pessimism.

Right after the conference, most of the community reactions I saw were critical. In the [Hacker News](https://news.ycombinator.com/item?id=49817680) (HN) thread where the video was posted, complaints about holding a Rails conference without talking about Rails stood out, along with remarks that optimism comes easily when you have millions. [Global Nerdy](https://www.globalnerdy.com/2026/09/27/dhhs-keynote-at-rails-world-2026-the-most-confusing-funeral-ive-ever-experienced/) picked a YouTube comment as its headline: "the most confusing funeral I've ever experienced."

Not everyone saw it that way. One person who was there reported that the mood was far from pessimistic. Others argued that because Rails comes with nearly everything you need, it is actually faster to work with alongside agents.

## What Stayed with Me

### He Got Some Things Right

I use coding agents every day, too, and I agree that AI has changed development productivity. The keynote had things worth nodding along to. His suggestion to expose a CLI so users can bring their own agents, instead of stuffing a chatbot into every app, was especially practical. His advice to hand work to agents asynchronously, as you would to a coworker, instead of sitting in front of a chat window waiting, also resembles what the industry is trying these days.

Even allowing for the fact that I'm a web developer, I think he is broadly right that the cost of rewriting in native frameworks or lower-level languages has dropped sharply. So I understand why he was so excited. Still, some parts made me uncomfortable throughout the talk.

### Inappropriate, Whatever the Facts

The first thing that bothers me is that this was the opening keynote of Rails World. It was the slot for presenting new Rails features and where Rails is headed, and there was a separate slot for AI the next day. Of the 63 minutes, only about three dealt with Rails' place, and even the first answer there was that for HEY, "we have our answer": native applications on the frontend and Rust on the backend. There were no new features and no roadmap. The creator of Rails stood on the community's stage and announced that he was taking a different road.

The tone bothered me more. He likened researchers who had seen frightening things in the lab to Oppenheimer, then said that Truman, who never wanted to see Oppenheimer again, "got the right end of it." At the end he said the black pill is for losers. Just before, he had called the audience "the best of the best," so he wasn't calling everyone in the room a loser. Still, it is a line that turns people who worry into losers. It sounded less like asking whether the worry has grounds than like judging what attitude people hold.

He also called the change agents will bring "a reformation of the computer." The agent was an "Agent Luther" that would "disintermediate the cleric class." I had been listening to a talk about technology, and at some point it started to feel like listening to someone who had come to believe in something.

There was also the demand that if your app didn't have a CLI, he wanted "to see it by next Friday," with no excuses because "you have the tokens," since delivering it was "your obligation." It was probably half a joke. Even so, it sounded more like an employer than a colleague. Even if every prediction eventually comes true, I don't think that makes it appropriate to have said it this way on this stage.

### "Nobody Knows" Was Only Aimed at Pessimism

What I found especially hard to accept was the double standard of certainty. To other people's pessimistic outlooks, he said in effect that nobody knows the future. Had he applied the same words to his own optimism, I might have accepted it, but he didn't.

| The standard applied to pessimism                                                                                      | The standard applied to optimism                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Economists can't even predict the stock market six months out, so about what society will look like, "they don't know" | By the end of the year, writing code by hand will be over for "virtually all programmers, virtually all companies"                 |
| "Maybe we should also have a little humility about predictions of the future"                                          | 20 seconds later: "The chances of this panning out and us getting abundance and joy is so vastly greater than us getting the doom" |
| "No one knows anything about the future. So therefore, the rational choice is to be happy about it"                    | 30 seconds later: "The utopia is almost here. We're going to get it"                                                               |

"We don't know" does come up on the optimistic side too. But the uncertainty was only about how: what to make native, how to change ways of working and architecture. On whether things will turn out well, he never hesitated. Having said "we don't know exactly" how much these tools can accelerate development, less than a minute later he agreed that a 1,000x gap between the worst and the best programmer "sounds about right."

He also talked about finishing Basecamp 5 this spring. Designers were given features to vibe code (building by telling an AI what you want without looking at the code yourself), and while each PR looked reasonable on its own, together they left the architecture "looking a little like a Swiss cheese." Up to this point, it sounds like a failure worth examining for what went wrong.

But what DHH said was wrong was their conclusion at the time, that the technology wasn't ready yet. Had they waited a little longer, Fable would have arrived and it probably would have worked as intended. When things fail, you wait for the next model; when they succeed, it proves AI was right. Seen that way, no outcome could ever give you a reason to let go of the belief.

I also took the Truman story differently. DHH's version was that Oppenheimer, who built the atomic bomb, worried, but Truman dismissed him, and since the world didn't end, the ones who worried were wrong.

The people who worried may well have contributed to the world not ending. After the Cuban Missile Crisis, a hotline was set up to connect the American and Soviet leaders directly, and treaties limiting nuclear tests and nuclear weapons followed. I don't know why he leaves out the possibility that catastrophe was avoided because people saw the danger and prepared.

(Older) developers will find Y2K more familiar. Many people fixed things ahead of time so it passed without major incidents, and later some said it had all been a lot of fuss over nothing. The phenomenon where the better the preparation works, the more pointless the worry looks, is called the preparedness paradox. Before saying "nothing happened, so there was no need to worry," shouldn't we also look at what was done to make sure nothing happened?

### Handing Over Judgment

Watching the talk, I also got the sense that he had handed AI not just implementation but judgment. I don't mean dependence on a particular company. On the contrary, he welcomed GPT-6 Astra for easing the fear that Anthropic would monopolize frontier models, and said DeepSeek showed that frontier models aren't the preserve of big American companies. We also saw earlier that he supports open-weight models.

What bothered me was what he treats as the important question. "There is only one serious question in this moment of software development," he said: "how do you get the most out of this intelligence explosion? Every other question is below that in the stack of values." Not knowing any Rust at all was a "privilege." He didn't look at a single line of the code for the C++ writing app he built, and as for how an agent found a five-year-old email: "I still don't fully know. And I'm a little scared to ask. But I am infinitely delighted."

On security, he says to prepare, because it's a problem technology can address: "Something is coming. We gotta be ready for that," and "we'll invent the technology." When it comes to worries about jobs and society, though, the answer becomes "no one knows, so be happy." It seemed as if preparation is rational only when AI can solve the problem, and anything else is just a gloomy attitude. What he called "pure game theory" also only works if worry and sadness are treated as the same thing. I wondered whether his own habit of worrying about security and preparing for it ever enters that calculation.

I thought about a similar question in [Where Frontend Came From, and Where It Goes After Agents](/en/2026/07/frontend-past-present-after-agents), which I wrote in July. I argued that even if agents write most of the code, people will likely pick familiar stacks they can read, because the people who approve deployments and get called in when things break stay the same. To confirm what you're deploying, I reasoned, you need to be able to read it.

DHH made the opposite choice. He picked Rust, which he doesn't know at all, and says he will evaluate the result from the outside as a black box, "as any business owner in history who's ever commissioned a group of programmers." I had actually noted that possibility as a caveat in my post: review may shift from reading code to checking behavior. That is exactly what DHH intends to do.

It's worth remembering that he owns the company. In that post I wrote that review responsibility is tied to organizations and the law. An owner can decide to take that responsibility on himself, but most developers, who press the approve button and have to answer for the result, don't get that option so easily. He is standing exactly where my argument applies least, which is why I don't think his choice alone refutes it.

Two days after the keynote, DHH [shared on X](https://x.com/dhh/status/2103595410921279635) that he had ported Omarchy's screensaver engine (ttfx) from Rust to x86-64 assembly. It was a one-shot translation by Opus 5.5, he said, and it ran up to 17x faster. Likening agents to a drill, he added that they would keep drilling "until the agentic drill bit hits bedrock." People asked how moving to assembly alone could make something 17x faster. What actually changed is laid out in detail in the [PR](https://github.com/omacom/ttfx/pull/35).

The verification wasn't careless. Using the existing Rust engine as the reference, it checked that the output of all 37 effects matched byte for byte across four CPU tiers and in emulated environments. Code review found and fixed three bugs and a memory leak. I agree with this kind of approach, "verifying behavior instead of reading code."

The comparison tools, however, were also built with AI. The comparison scripts and tests were added in the same PR, and 131 of its 187 commits list Claude as a co-author. The review that found the bugs was done by Codex. Even the Rust engine used as the reference had been ported from the Python original (TerminalTextEffects) with agents a month and a half earlier, matched bit for bit against the original's output at the time.

So the original ground truth was the Python output, and from there the translated code and the verification tools were mostly built with AI. Comparing against ground truth is a trustworthy method. It just comes with the condition that the comparison itself works. Among the problems Codex found were tests that were missing yet passing silently. Checking the comparison tools themselves remains a job someone has to do.

The PR also explains where the speed came from. When all the effects were first ported, it was 4.11x faster on a single core, and after further optimization it reached a geometric mean of 7.53x (9.79x on two cores). In order of impact, the gains came from data layout, removing repeated work, memory optimizations, and SIMD and threads. All of these can be done without assembly.

In fact, another contributor submitted a faster engine written in Rust. Redesigned from the ground up for speed, it was 11x faster than the original Rust engine on two cores, and 1.26x faster than even the assembly engine ([PR #44](https://github.com/omacom/ttfx/pull/44)). It beat, in Rust, the speed DHH said he got by moving to assembly. Getting faster didn't require changing languages.

DHH accepted the result. He [thanked the contributor](https://github.com/omacom/ttfx/pull/44#issuecomment-5860065656), noting that on his own Zen 5 machine, too, the new engine was 1.20x faster than the assembly engine on a single core and 1.25x on two, with byte-identical output on all 37 effects. Then he tore out the assembly engine he had built with agents and replaced it with the contributor's Rust engine. On September 28 (Korea time), [the follow-up PR #47](https://github.com/omacom/ttfx/pull/47), which kept the original commits and added fixes from review, was merged, making fx the default engine from ttfx 0.5 on. That is also when #44 was closed without being merged.

That contributor's commits also list Claude as a co-author. Both sides built with AI, the side that chose a different design was faster, and DHH changed his own choice after seeing the result. Tests confirmed that the two engines behave the same. But whether assembly was really necessary, and whether a different design could do better, had to be judged separately. In this case, I think what changed the performance was that judgment more than the language.

### The Value of Reading and Writing Code Yourself

I don't blame him for changing his mind. He didn't hide what he used to say, either. Midway through the keynote, he played a short clip of his past self. In it, he says that if he had only wanted outcomes, he could have become a project manager 20 years ago, but that he fell in love with programming and would rather retire than give it up. When the clip ended, he said he had retired from being a professional programmer around March, and that the clip was "totally true." He had said he would rather retire than give up programming, so now that he has stopped writing code by hand, he has in fact retired. Instead of calling it a change of mind, he squared it with his old words by saying he had kept them.

In the same keynote he also played a clip from a 2005 talk in Brazil, calling "look at all the things I'm not doing" the Rails moment: the scene where, thanks to conventions, things wired themselves together without writing out configuration. Back then, the code you didn't have to write was the point of pride.

In 2026 the point of pride became writing "150,000 lines of code in one month," "about 60 times more code than my long-term running average." He admitted that much of it was Rust verbose enough that he would never have tolerated it in Ruby. If he once valued leaving little code for people to read and fix, he now seemed more interested in how much agents can build.

Put his earlier principles next to what he said this time, and the difference shows.

| Principles he left us                                                                                                                                                                                              | The 2026 keynote                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Rails Doctrine's "Exalt beautiful code"                                                                                                                                                                        | Letting the agent "spit out more than was necessary, in a way I would never tolerate from my Ruby code." "C++ as a black box is a great language" |
| The Rails Doctrine's "Push up a big tent": "We need disagreement. We need dialects. We need diversity of thought and people." A large community fits under one tent because there are so few, if any, litmus tests | Calling people who think differently and worry losers: the black pill is for losers                                                               |
| DRY (Don't Repeat Yourself), one of the two principles the [Rails guide](https://guides.rubyonrails.org/getting_started.html#rails-philosophy) highlights                                                          | "The price of repetition has gone to near zero"                                                                                                   |
| _It Doesn't Have to Be Crazy at Work_ (2018), co-written with Jason Fried                                                                                                                                          | "By next Friday," "the best kind of addiction," "full acceleration"                                                                               |

That said, it's hard to claim he threw out all of Rails' values. He still talked up Rails' strengths, saying conventions save tokens too. His reluctance to lean on big platforms shows in his support for open-weight models. I think the idea of building more with small teams carries on. What seems to have changed is his answer to how much it matters, for that goal, that people read and write the code themselves.

His way of making bold declarations hasn't changed. It was the same when he criticized TDD, when he took on Apple, and when he left the cloud. I think it's a temperament that has stayed the same for 20 years. He himself says that if he had said the same thing two or three months earlier, people would have said "that dude's got a screw loose." In that case, this position could change too. Yet his certainty already extends to virtually every programmer quitting hand-written code by the end of the year, lumping together people who have spent years learning judgment and people who are only starting to.

## That Process Is Where I Learned Judgment

What Rails gave me as a junior was conventions, writing less code, and a web that even a small team could build and run. I could enjoy the work without knowing why probably because someone had already worked out the why and turned it into conventions. Judgment someone made earlier was built into the framework, and by following it I learned little by little.

In the Rails Doctrine's ["Provide sharp knives"](https://rubyonrails.org/doctrine#provide-sharp-knives), the part about trusting people with powerful tools is followed by a part about teaching. DHH wrote:

> The language and the framework should be patient tutors willing to help and guide anyone to experthood. While recognizing that the only reliable course there goes through the land of mistakes: Tools used wrong, a bit of blood, sweat, and perhaps even some tears. There simply is no other way.

Getting work done quickly with Rails was great, but what feels bigger now is that I picked up judgment while doing that work.

That's why what he said about writing code by hand left a bitter taste. Work he said he had spent a quarter of a century "chiseling code by hand and loving every moment of it," he now treats like a bug in Sentry, a sign that something went wrong. He also says it is "no longer an economically productive enterprise for the vast majority of programmers." To me it sounded as if writing code by hand had become a foolish thing to do. And I am someone who learned, little by little, by spending that time.

Behind DHH's ability to say he'll look only at results without reading the code, there is presumably the judgment he built up over that time. I've been practically living on X and HN lately for my book, and in what I've seen, most of the people who say AI is wonderful are people who don't have to worry much about money or their position. That doesn't mean they're wrong. But using the same tool doesn't put people in the same situation. "The black pill is for losers" strikes me as an easy thing to say from the side with little to lose. I saw HN comments making that point too.

One well-liked comment under the keynote video separated the people who pay from the people who are paid: "If you have the privilege of paying someone's wage, this is the leverage you want. For the workers, they're using the very tool that removes all the leverage they once enjoyed."

The same gap showed up in the ttfx PR. When a commenter said the change gave up portability for no perceivable gain, DHH [replied](https://github.com/omacom/ttfx/pull/35#issuecomment-5846803103) that anyone who thought this came at the expense of something else was "still stuck in fixed-pie thinking." Then he wrote: "I have unlimited tokens. We can fix everything, we can do anything."

It reminded me of what he said about cutting Omarchy's install time: "There's some addiction going on here. But it's the best kind of addiction." Trade-offs no longer seem to feel like costs to him. If you can use unlimited tokens, it's easy to end up asking only whether you want to.

As I mentioned, I feel the shift toward handing implementation to agents every day, and I don't think it's wrong. But I'm not sure the approach chosen by someone who has already learned judgment should be recommended as-is to people who are only now learning. It would be good if they could learn elsewhere even as time spent writing code shrinks. What I wanted to hear on that stage was how Rails could help with that learning. If you call the people who worry losers, that conversation can't happen.

Ten years ago, I liked Rails without knowing why. Only now am I thinking about what I learned because of it, yet from the very person who made it, I didn't hear how that learning could continue. That is what I regret, and it leaves me unsettled.

## References

- [Rails World 2026 Opening Keynote (YouTube)](https://www.youtube.com/watch?v=vDjW_dRyKXY)
- [Rails World 2026: DHH session page](https://rubyonrails.org/world/2026/speakers/dhh)
- [The Rails Doctrine](https://rubyonrails.org/doctrine)
- [DHH, No RailsConf](https://world.hey.com/dhh/no-railsconf-faa7935e)
- [Rails Foundation, See you at the last RailsConf](https://rubyonrails.org/2025/5/29/final-railsconf)
- [Hacker News: Rails World 2026 Opening Keynote](https://news.ycombinator.com/item?id=49817680)
- [Global Nerdy, DHH's keynote at Rails World 2026](https://www.globalnerdy.com/2026/09/27/dhhs-keynote-at-rails-world-2026-the-most-confusing-funeral-ive-ever-experienced/)
- [Where Frontend Came From, and Where It Goes After Agents](/en/2026/07/frontend-past-present-after-agents)
- [DHH, announcing the ttfx assembly port (X, September 25, 2026)](https://x.com/dhh/status/2103595410921279635)
- [omacom/ttfx PR #35: Add an x86-64 assembly engine](https://github.com/omacom/ttfx/pull/35)
- [omacom/ttfx PR #44: Add the fx engine](https://github.com/omacom/ttfx/pull/44)
- [omacom/ttfx PR #47: Make fx the engine and remove the assembly engine](https://github.com/omacom/ttfx/pull/47)
