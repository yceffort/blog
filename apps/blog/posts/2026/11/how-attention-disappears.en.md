---
title: 'Thirty Days of Working by Prompt: How <em>Attention</em> Disappears'
tags:
  - career
  - ai
  - essay
published: true
date: 2026-11-14 17:57:00
updated: 2026-11-14 18:15:35
description: 'I counted 30 days of my own records, and there was no day when I stayed on one thing for 60 minutes'
art:
  undraw: distractions
---

## Table of Contents

## Why I counted

These days I work by prompt. I keep several Claude Code sessions open and build code by moving back and forth between them. I wanted to know what a day of working like that looks like, so on a Saturday morning I gathered the records I had left over the past 30 days and counted them: Claude Code sessions, Slack messages, my calendar, and PRs and commits.

On weekdays I opened 31 sessions and sent 232 prompts a day. With those prompts I created 17.5 PRs a day.

Yet across 22 weekdays, there was not a single day when I stayed on one thing for 60 minutes or more. The longest was 59 minutes.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=stay&hl=10-19,10-22,10-27,11-06&lang=en" title="For each of the 22 weekdays, the longest time I stayed on one thing. The four dated days are covered one by one below" height={300} />

Here, "one thing" means one Claude Code session or one Slack conversation. I lined up the prompts and Slack messages I sent in time order, and counted everything up to the point where I moved to a different session or conversation as one stretch. If I wrote nothing for more than 30 minutes, I cut the stretch there.[^1] Days with a dot under the bar are days when I had put a focus block on my calendar to keep meetings out. I look at that block separately later.

> The period is the 30 days from October 15 to November 13, 2026: 22 weekdays and 8 weekend days. All times are Korea Standard Time.
>
> I collected four kinds of records: the session logs Claude Code leaves on the machine (two machines), the timestamps and conversations of my own messages gathered through Slack search, the times and categories of calendar events, and GitHub PRs, reviews, and default-branch commits. I did not store Slack message bodies or event titles. I did not separate company work from personal work and added them together, because wherever it is spent, the attention belongs to one person.
>
> - **Prompts**: I counted only what I typed myself, excluding tool results and commands. The two machines were tallied with different scripts, so the counting rules are not exactly the same.
> - **Switches**: Among items written within 10 minutes of the previous one, I counted only those written to a different session or conversation than the one just before.
> - **Quiet time**: On weekdays between 10:00 and 19:00, the time when I wrote nothing in Slack for 25 minutes or more, minus meeting time. Gaps shorter than 25 minutes were not counted at all. The 25 minutes come from the length of one Pomodoro, so the values change if the threshold changes.
> - **Concurrent sessions**: Once a session had a record, I treated it as running for the next 15 minutes and counted, minute by minute, how many overlapped.
> - **Meetings**: Based on the calendar. I did not take into account whether I actually attended, and meals and social events (26 minutes a day) are included.
>
> These records capture only what I wrote. Reading Slack without replying, speaking in meetings, and time spent reading code and thinking are not captured. If I only read or thought for more than 30 minutes without writing anything, that time was not counted as time on one thing. The 60 minutes is a measure of writing only.
>
> Every day with a focus block was a Monday or a Friday, but I did not take differences between days of the week into account. I also did not take into account a comparison with the time before I changed jobs or started using agents, or the size of each PR and commit.

I went through the 22 days one at a time. Here are four of them.

## The busiest Thursday

On Thursday, October 22, I sent 314 prompts to 49 Claude Code sessions and wrote 395 messages in 21 Slack conversations. Together that is 709, the most of any day in the 30. I had 3 meetings between 12:00 and 18:00, 240 minutes in total.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=day&d=10-22&lang=en" title="The numbers for October 22. The vertical line is the median of the 22 weekdays" height={290} />

That day, the longest stretch with neither Slack nor a meeting was 4 minutes. I switched between sessions and conversations 258 times.

That does not mean I got nothing done. I created 9 PRs and 42 commits piled up. By the records alone, it was a day when I did a lot of work, as long as you leave out the 4 minutes.

## The Tuesday when Slack was quiet

Looking at a day like that, Slack seems to be the cause. So I looked for the weekday when I used Slack the least. It was Tuesday, October 27, when I wrote 122 messages.

That day, the stretches of 25 minutes or more with neither Slack nor a meeting added up to 173 minutes, and one of them lasted 101 minutes. It was the longest quiet stretch of all 22 days. The 25 minutes come from the length of one Pomodoro. I did not count shorter gaps because I judged them too short to get hold of anything.

Yet the longest I stayed on one thing that day was 27 minutes, the third shortest of the 22 days.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=day&d=10-27&lang=en" title="The numbers for October 27. The vertical line is the median of the 22 weekdays" height={290} />

Even during those quiet 101 minutes, I never kept sending prompts to one session for more than 27 minutes. That means I either moved between sessions or wrote nothing for more than 30 minutes. I sent 200 prompts that day and opened 18 sessions.

Even with Slack quiet, the 60 minutes did not appear. There was one more reason besides Slack.

## AI increased my session switching

AI is why I switch sessions more. No records remain from before I used agents, so I cannot show in numbers how much it increased. But why it increased shows plainly in the records.

Before AI, I could not jump between sessions this frantically. When I typed the code myself, the work stopped when I took my hands off it. If I moved to something else, what I had been doing stayed where it was, so there was a limit to how many things I could have going at once.

Now the work moves forward even when I am looking elsewhere. After I send a prompt, my hands are free for the few minutes the agent works. Instead of waiting those few minutes, I open another session. Once that session starts working, my hands are free again, so I open a third session or look at Slack. I move back and forth because I now can.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=sessions&lang=en" title="The number of sessions running at the same time, and the number of prompts sent in a row to one session" height={340} />

The 31 sessions I opened in a day overlapped as they ran. Of the time when at least one session was running, two or more were running together 44% of the time, and three or more 17% of the time. At the peak, 8 ran at once.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=sessday&hl=10-22,10-27,11-06&lang=en" title="The number of Claude Code sessions opened each day over the 30 days. The pale bands are weekends" height={260} />

The order in which I sent prompts shows the same thing. One prompt in three went to a different session than the one before. In 47% of cases I sent exactly one prompt to a session and then moved to another, and in only 6% did I send 10 or more in a row.

I also move between the agents and Slack. On a weekday I switched 211 times, and 58% of those were between Claude Code and Slack. I send a prompt, answer Slack while I wait, come back, and send the next prompt.

Working like this also makes each piece of work smaller. On weekdays I created 17.5 PRs a day, and each PR took 13 prompts. Most PRs were merged within 5 minutes of being created.[^2] There is no reason to hold on for 60 minutes to a piece of work that is finished in 13 prompts and merged 5 minutes later.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=make&hl=10-29,11-06&lang=en" title="PRs created each day over the 30 days. The pale bands are weekends" height={260} />

Of the 22 days, the one when I stayed on one thing the longest was Friday, November 6 (59 minutes). I created 2 PRs that day, the fewest of the 22. It is a single case, so it is hard to call it a rule.

Judged by output alone, this way of working runs well. I created 452 PRs in 30 days. In exchange, the time I spend holding on to one thing for long is gone.

## A service I build alone

I also thought about what this pace does to my colleagues. A team cannot read every PR when 17.5 come out a day and most are merged within 5 minutes. They probably find it hard to keep up.

In fact, I am still building the service I am working on by myself.

Working alone is fast. In exchange, I become the only person who knows this code. What a machine can check, such as bundle size or circular imports, is protected by the guardrails I described in my [post on performance work](/2026/10/performance-improvement-workflow). But whether the structure is consistent, and whether someone else could take it over, can only be known if someone reads it. I am building at a pace that the people who would read it cannot follow.

I review too. Over the same 30 days I left 564 reviews on 498 PRs. I reviewed more PRs than I created (452). That is 24 reviews per weekday, and on the busiest day, Wednesday, November 4, I created 25 PRs while leaving 48 reviews on 47 PRs. Of the 564, 487 were approvals and 68 were comment-only reviews.

I look closely when someone asks me to. Most of the time I skim and approve if there is no issue, or I review only the important ones that I need to see. It is a kind of hub role.

## Mondays and Fridays with a focus block

A focus block is an event I put on my own calendar. I started doing it after reading Tanya Reilly's [The Staff Engineer's Path](https://www.oreilly.com/library/view/the-staff-engineers/9781098118723/). It signals that I would like no meetings scheduled in that time, and I also keep that time free to spend on one thing. I block 300 minutes every Monday and Friday from 14:00 to 19:00, so 9 of the 22 days (4 Mondays and 5 Fridays) had this block.

Monday, October 19 was one of those days. Yet on that day I never went more than 25 minutes with neither Slack nor a meeting. The longest quiet stretch was 18 minutes. I had 4 meetings totaling 240 minutes and opened 44 sessions.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=day&d=10-19&lang=en" title="The numbers for October 19. The vertical line is the median of the 22 weekdays" height={290} />

Even with the block in place, meetings were scheduled over it. The last meeting on October 19 ended at 17:30. On 6 of the 9 block days, there were meetings after 14:00, when the block begins. On Friday, October 30, 480 minutes of meetings were scheduled between 10:00 and 19:00, so at least 240 of the block's 300 minutes overlapped with meetings.

There were also days with no overlap. On Friday, November 6, the day mentioned above, meetings ended at 14:00, so no meeting overlapped the block's 300 minutes. It was the day I stayed on one thing the longest of the 22, and it was still 59 minutes. That day too, I opened 14 sessions and wrote 201 Slack messages.

<BarCompare title="Time on days with and without a focus block" unit="min" before="Days without a block" after="Days with a block" rows="Stretches of 25+ minutes with neither Slack nor a meeting|76|103;Longest time on one thing (median)|35|35" />

Averaged over the 9 days, blocking out 300 minutes added 27 minutes of quiet time. And those 27 minutes came only from Fridays. The 4 Mondays averaged 77 minutes, almost the same as days without a block (76 minutes), while the 5 Fridays averaged 124 minutes. The longest time on one thing was the same as on days without a block.

<BarCompare title="Slack messages on days with and without a focus block" unit="messages" before="Days without a block" after="Days with a block" rows="All of Slack|315|219;Chat room with my teammates|103|26;The rest of Slack|212|192" />

On block days I wrote 96 fewer Slack messages. Of those, 77 came from the chat room where I talk about work with my teammates. It is the room I write in most on Slack: around 100 messages a day from Tuesday to Thursday, 13 on Mondays, and 37 on Fridays. Conversation with my teammates clearly drops on block days. The rest of Slack fell by only 20 messages even with a block.

All a focus block can keep out is meetings, and it did not keep out all of those either. It did nothing to help me stay on one thing for long. Even between 14:00 and 19:00 on block days, I wrote an average of 196 prompts and Slack messages a day. That is one every 92 seconds, and 19% fewer than in the same hours from Tuesday to Thursday, when there is no block (243).

## The shape of a weekday

Laying all 22 days on top of one another gives this shape.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=heatmap&lang=en" title="Prompts and Slack messages I wrote, by day of week and hour, and commits by hour" height={470} />

Between 10:00 and 19:00 on weekdays I write 367 prompts and Slack messages a day. That is one every 88 seconds. The darkest cell is the 16:00 hour on Thursdays: 87 in an hour, one every 41 seconds. Only the 12:00 hour, around lunch, drops to half, and the 19:00 hour is the second busiest of the day.

I do four kinds of work in these hours.

The first is building. The 31 sessions and 17.5 PRs above come from here.

The second is meetings. Of the 540 minutes between 10:00 and 19:00 on a weekday, 203 minutes, or 38%, are meetings. Chapter and engineering community work accounts for 62% of that meeting time and took place on 19 of the 22 days. I write in Slack during meetings too. Of the 203 meeting minutes, at most 82 are in stretches of 25 minutes or more without Slack.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=meet&lang=en" title="Meeting time within 10:00-19:00 on weekdays, and its makeup" height={300} />

The third is conversation with my teammates. In that one chat room mentioned earlier, I wrote 1,577 messages over 31 days. That is 25% of the 6,207 Slack messages I wrote. We trade short lines there, with a median length of 9 characters, 75 times a day.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=slack&lang=en" title="Where I wrote Slack messages, and messages in the chat room with my teammates by day of week" height={490} />

The fourth is answering questions that come from outside the team. Of the 3,227 messages I wrote in channels, 3,133, or 97%, were replies in threads. In 31 days I started only 94 new posts in channels. I wrote 2.3 times as many replies in channels outside my team (2,097) as in my own team's channels (908). On top of that there were 1,394 one-on-one DMs.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=reply&lang=en" title="The share of replies among the messages I wrote in channels, and the channels where I replied" height={210} />

All four are my job, and none can be dropped. The problem is that all four are packed into the hours between 10:00 and 19:00.

In an essay written in 2009, Paul Graham said that a maker's schedule and a manager's schedule are different. A manager divides the day into one-hour units, while a maker wants at least half a day in one piece. A single meeting splits the afternoon in two, and since both pieces are too short for hard work, the whole afternoon is lost.[^3] My day holds both schedules at once. Add to that Slack arriving by the minute and the few minutes spent waiting for an agent.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=window&hl=10-19,10-22,10-27,10-30&lang=en" title="Where the 540 minutes between 10:00 and 19:00 went on each of the 22 weekdays" height={340} />

Take 203 minutes of meetings out of 540 and 337 remain. Of those, stretches of 25 minutes or more with neither Slack nor a meeting average 87 minutes a day. Two days had 0 minutes, and across all 22 days only one stretch lasted more than 90 minutes: the one on October 27 described above.

Work being cut into small pieces is not new. In 2004, González and Mark shadowed analysts, software developers, and managers through whole working days. People spent an average of 3 minutes on a task before moving to another, and even when work was grouped by theme (the paper calls this a working sphere), the average was 12 minutes. One person was involved in an average of 10 spheres at once.[^4] Offices were already like that 20 years ago. But back then, even with ten things in play, only one could move forward at a time. Now as many move forward as I have sessions open. With fewer reasons to put things off, I ended up holding all of them at once.

## Evenings and weekends

Working like this does not reduce the amount I produce. In a 2008 experiment by Mark, Gudith, and Klocke, people who were interrupted actually finished their tasks sooner, with no difference in quality. They made up for the interrupted time by hurrying, but at the cost of more stress, more frustration, more time pressure, and more effort.[^5]

Stress does not show up in the records. Timestamps do.

<LiveDemo src="/demos/how-attention-disappears/index.html?view=daily&hl=10-17,10-24&lang=en" title="Prompts and Slack messages written each day over the 30 days. The pale bands are weekends" height={310} />

Of the prompts and Slack messages I wrote on weekdays, 21.5% were written after 19:00. On 13 of the 22 weekdays, my last commit came after 22:00.

Weekends are similar. On Saturday, October 17, I sent 173 prompts and 103 commits piled up. By commit count it was the biggest day of the 30. Saturday, October 24 was the day I spoke at FEConf, and also my birthday. It was the only day in the 30 when I created no PR, yet I still sent 47 prompts. I created PRs on 7 of the 8 weekend days, and commits on weekends averaged 40 a day, the same as on weekdays. In the same 30 days I published 13 posts on this blog.

<BarCompare title="Daily averages on weekdays and weekends" unit="per day" before="Weekdays" after="Weekends" rows="Prompts|232|112;Slack messages|275|19;Commits|40|40;PRs|17.5|8.4" />

In those 30 days there was not a single day without a prompt or a commit.

## How the attention disappeared

I only learned how my attention disappeared after counting. It did not vanish all at once. It drained away a little at a time, once every 88 seconds, with each prompt and each reply.

No single cause can be picked out either. The 60 minutes did not appear on the day Slack was quiet, nor on the days with a focus block. Working through agents, meetings, conversation inside the team, and replies outside the team all overlap in the same hours.

Even broken up like that, the work does not stop. The agents keep working while I look at another session, so PRs came out at 17.5 a day even though there was not one day when I stayed on one thing for 60 minutes.

Because the amount I produce does not fall, it is hard to see this state before counting. The PRs and commits keep coming.

## The recommendations I got

I asked Claude, which had counted the records with me, how my current state looked and what I should change. The answer was that I am overloaded, but the output is good enough that the problem does not show. It also said that having no days off is more urgent than attention. There were four recommendations.

| Recommendation                                             | Now                                        |
| ---------------------------------------------------------- | ------------------------------------------ |
| Keep one day a week free of prompts and commits            | 0 of 30 days                               |
| Limit concurrent sessions to 2 and try it for two weeks    | Three or more ran together 17% of the time |
| Decide how much chapter work to do                         | 147 minutes a day, 62% of meetings         |
| During focus blocks, open only one session and close Slack | Blocked 300 minutes, gained 27             |

The second recommendation came with a caveat. If I cut sessions to 2, the 17.5 PRs a day will fall too. I would be trading PRs for the 60 minutes. The reason for the third was this: chapter work is 62% of my meeting time, so if I want more time for building, that is the first thing to settle.

## What the counts do not show

Days like these do not seem to be mine alone. Ranganathan and Ye of UC Berkeley studied 200 employees of a U.S. technology company from April to December 2025 and reported that AI did not reduce work but intensified it. People ran several agents in parallel and held several things at once, and even while feeling that the work was going well, they felt they were always moving between several things.[^6]

Reviews falling behind as PRs increase has also been observed across many teams. According to a report in which Faros AI analyzed records from more than 10,000 developers on 1,255 teams, developers on teams that use AI heavily merged 98% more PRs, and the time PR review took rose 91%. Yet no improvement was found in company-level metrics.[^7]

I am inside this trend too, and by the numbers my case is more extreme. In the benchmark table LinearB built from 8.1 million PRs, a developer at a top-10% organization merges more than 2 PRs a week.[^8] I merged 83 a week. By Microsoft's tally, the average worker receives 153 Teams messages per weekday, while I write 275 Slack messages a day. The top 20% of users who receive the most messages and meeting invites are said to get a ping every 2 minutes during working hours, while I was writing something every 88 seconds.[^9]

Whether working this hard makes me a good developer, a good colleague, or someone who is rated well is a different matter. I am still not sure about that.

[^1]: The time on one thing, the number of switches between sessions and conversations, and the time without Slack were calculated only from Slack and the one machine that produced 86% of the prompts. Aligning the timestamps of the other machine's sessions and merging them would make the stretches shorter. The number of concurrent sessions and the number of prompts sent in a row were counted separately on each machine and then added.

[^2]: This is calculated from the 424 PRs of one account, out of the 452. I took the median time to merge for each day, and the median of those values is 5 minutes. On 18 of the 27 days that have a value, it was 10 minutes or less.

[^3]: Paul Graham, [Maker's Schedule, Manager's Schedule](https://paulgraham.com/makersschedule.html) (July 2009). The original reads "A single meeting can blow a whole afternoon, by breaking it into two pieces each too small to do anything hard in."

[^4]: Victor M. González, Gloria Mark, ["Constant, Constant, Multi-tasking Craziness": Managing Multiple Working Spheres](https://ics.uci.edu/~gmark/CHI2004.pdf) (CHI 2004). The abstract says "People average about three minutes on a task" and "people spend about 12 minutes in a working sphere before they switch to another".

[^5]: Gloria Mark, Daniela Gudith, Ulrich Klocke, [The Cost of Interrupted Work: More Speed and Stress](https://ics.uci.edu/~gmark/chi08-mark.pdf) (CHI 2008). The abstract says "people completed interrupted tasks in less time with no difference in quality" and "this comes at a price: experiencing more stress, higher frustration, time pressure and effort".

[^6]: Aruna Ranganathan, Xingqi Maggie Ye, [AI Doesn't Reduce Work: It Intensifies It](https://hbr.org/2026/02/ai-doesnt-reduce-work-it-intensifies-it) (Harvard Business Review, February 2026). The quotations are taken from the passages [excerpted by Simon Willison](https://simonwillison.net/2026/Feb/9/ai-intensifies-work/): "AI introduced a new rhythm in which workers managed several active threads at once" and "a sense of always juggling, even as the work felt productive".

[^7]: Faros AI, [The AI Productivity Paradox Report 2025](https://www.faros.ai/blog/ai-productivity-paradox-report-2025) (July 2025). It says "Developers on teams with high AI adoption complete 21% more tasks and merge 98% more pull requests", "PR review time increases 91%", and "we observed no significant correlation between AI adoption and improvements at the company level". It is a correlation analysis that compares, for each team, the two quarters with the lowest AI adoption against the two with the highest, and it comes from a company that makes products for analyzing engineering metrics.

[^8]: LinearB, [2026 Software Engineering Benchmarks Report](https://linearb.io/resources/engineering-benchmarks-report). The report analyzed 8,109,244 PRs and 4,813 teams. In its benchmark table, Merge Frequency (per dev/week) is above 2.0 for Elite, the top 10%, and below 0.66 for the bottom 40%. My figure converts the 357 PRs merged in 30 days to a weekly rate.

[^9]: Microsoft, [Breaking down the infinite workday](https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday) (Work Trend Index Special Report, June 2025). It says "The average worker receives 153 Teams messages per weekday." The methodology explains the two-minute interval as follows: "The two-minute figure reflects the average time between pings during an eight-hour workday." and "Based on the top 20% of users by ping volume received."
