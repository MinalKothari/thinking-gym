-- ============================================================
--  THINKING GYM · seed (6 fully-playable puzzles, one per input model)
--  Scheduled on the next 6 days starting today (UTC) so get_today_puzzle() works now.
--  The 90-day content bank is enriched into this shape by the Feature-5 pipeline.
-- ============================================================

-- Day 1 · LATERAL
insert into puzzles (publish_date, type, muscle, difficulty, title, prompt, hints, payload_public, solution, answer, share_line, status) values (
  (now() at time zone 'UTC')::date + 0, 'lateral', 'Questioning assumptions', 1,
  $tg$The keeper's guilt$tg$,
  $tg$One evening a man switched off a light and went to bed. The next morning the news reported many deaths at sea, and he felt responsible — though he broke no law. Why?$tg$,
  $tg$["His job is the light itself.","The light was a warning to others.","Who relies on a light at night near the coast?"]$tg$::jsonb,
  $tg${"kind":"lateral","suggested":["Is it about his job?","Did people die at sea?","Was the light a warning?","Did he break the law?"],"clues":[{"label":"It's tied to his job"},{"label":"Others rely on the light"},{"label":"He turned the light off"}]}$tg$::jsonb,
  $tg${"kind":"lateral","yes":["job","work","light","lamp","lighthouse","sea","ocean","ship","boat","wreck","warn","warning","keeper","night","coast","water","dark","responsible","captain","sailor","navig","rock"],"no":["murder","kill","gun","poison","crime","illegal","law","fire","bomb","steal","rob","bill","blackout","bedroom"],"solveWords":["lighthouse","keeper"],"clueKw":[["job","work","keeper","lighthouse","duty","employ"],["warn","warning","ship","boat","sea","sailor","captain","navig","rely","others"],["off","switch","dark","turn","stop","out"]]}$tg$::jsonb,
  $tg$He is a lighthouse keeper. He switched off the lamp, so ships had no warning and wrecked on the rocks.$tg$,
  $tg$🔍 Cracked today's lateral puzzle in ⬛ questions. Your turn →$tg$, 'live');

-- Day 2 · SPOT THE FLAW
insert into puzzles (publish_date, type, muscle, difficulty, title, prompt, hints, payload_public, solution, answer, share_line, status) values (
  (now() at time zone 'UTC')::date + 1, 'spot_flaw', 'Evaluating arguments', 1,
  $tg$The 90% diet$tg$,
  $tg$“Ninety percent of people who tried our diet lost weight, so the diet works.” What's the flaw?$tg$,
  $tg$["Who is missing from that 90%?","Is there a group who didn't diet to compare against?","Did the diet cause it, or did motivated people?"]$tg$::jsonb,
  $tg${"kind":"spot_flaw","options":["Only people who stuck with it are counted, and there's no control group","90% is simply not a big enough number to matter","Losing weight is not actually healthy","The diet is probably too expensive to be worth it"]}$tg$::jsonb,
  $tg${"kind":"spot_flaw","correct":0}$tg$::jsonb,
  $tg$Selection / survivorship bias: only people who stuck with it are counted — dropouts and regainers are invisible — and there's no control group. The 90% proves almost nothing.$tg$,
  $tg$🧠 Found the hidden flaw today. Can you spot it? →$tg$, 'live');

-- Day 3 · FERMI
insert into puzzles (publish_date, type, muscle, difficulty, title, prompt, hints, payload_public, solution, answer, share_line, status) values (
  (now() at time zone 'UTC')::date + 2, 'fermi', 'Decomposition & estimation', 1,
  $tg$Balls in a bus$tg$,
  $tg$Roughly how many table-tennis balls would fit inside a standard school bus? Build your estimate step by step.$tg$,
  $tg$["Estimate the bus's interior volume in cubic centimetres.","A ball is a ~4 cm sphere (~33 cm3).","Spheres only pack to ~65-70% of a space."]$tg$::jsonb,
  $tg${"kind":"fermi","unit":"balls","seed":[{"label":"bus volume (cm3)","op":"×"},{"label":"packing efficiency","op":"×"},{"label":"÷ volume of one ball (cm3)","op":"÷"}]}$tg$::jsonb,
  $tg${"kind":"fermi","target":1200000,"steps":["Bus interior ≈ 2.5 m × 2.5 m × 10 m = 60 m3","60 m3 = 60,000,000 cm3","One ball ≈ 33 cm3","Spheres pack to ~70% → 60,000,000 × 0.7 ÷ 33 ≈ 1.2 million"]}$tg$::jsonb,
  $tg$~1.2 million. Bus ≈ 2.5 × 2.5 × 10 m = 60 m3 = 60,000,000 cm3; ÷ ~33 cm3 × 0.7 packing ≈ 1.2 million.$tg$,
  $tg$📏 My estimate landed within an order of magnitude. How close can you get? →$tg$, 'live');

-- Day 4 · DEDUCTION
insert into puzzles (publish_date, type, muscle, difficulty, title, prompt, hints, payload_public, solution, answer, share_line, status) values (
  (now() at time zone 'UTC')::date + 3, 'deduction', 'Deductive logic', 1,
  $tg$Odd to even$tg$,
  $tg$I am an odd number. Take away one letter and I become even. What number am I?$tg$,
  $tg$["Think in words, not arithmetic.","The letters that remain spell a word.","It's a single digit."]$tg$::jsonb,
  $tg${"kind":"deduction"}$tg$::jsonb,
  $tg${"kind":"deduction","accept":["seven","7","seven (7)"]}$tg$::jsonb,
  $tg$SEVEN — remove the “S” and you're left with EVEN.$tg$,
  $tg$🧩 Solved today's logic puzzle. Think you can? →$tg$, 'live');

-- Day 5 · SECOND-ORDER (open)
insert into puzzles (publish_date, type, muscle, difficulty, title, prompt, hints, payload_public, solution, answer, share_line, status) values (
  (now() at time zone 'UTC')::date + 4, 'second_order', 'Consequence thinking', 1,
  $tg$Free buses$tg$,
  $tg$A city makes all buses free to cut car traffic. What's a likely unintended effect? Jot your angles — short, no essays.$tg$,
  $tg$["Who actually switches to the bus — drivers, or walkers and cyclists?","What happens to bus crowding and speed?","Does car traffic really fall?"]$tg$::jsonb,
  $tg${"kind":"open","lenses":["Who actually switches?","What gets worse?","Does it hit the goal?","Who's assuming what?"],"keyAngles":[{"label":"Walkers/cyclists switch, not drivers"},{"label":"Buses overcrowd and slow down"},{"label":"Car traffic barely falls"}]}$tg$::jsonb,
  $tg${"kind":"open","keyAngles":[{"label":"Walkers/cyclists switch, not drivers","pct":41,"lens":"Who actually switches?","kw":["walk","cycl","pedestrian","not driver","non-driver","already","bike"]},{"label":"Buses overcrowd and slow down","pct":58,"lens":"What gets worse?","kw":["crowd","overcrowd","slow","packed","full","delay","jam"]},{"label":"Car traffic barely falls","pct":33,"lens":"Does it hit the goal?","kw":["car","traffic","barely","won't","doesn't fall","still drive","goal","fail"]}]}$tg$::jsonb,
  $tg$Mostly former walkers and cyclists ride, not drivers; buses overcrowd and slow down, while car traffic barely drops. The lever misses its target.$tg$,
  $tg$🔮 I predicted the twist most people miss. Try it →$tg$, 'live');

-- Day 6 · REFRAME (open)
insert into puzzles (publish_date, type, muscle, difficulty, title, prompt, hints, payload_public, solution, answer, share_line, status) values (
  (now() at time zone 'UTC')::date + 5, 'reframe', 'Problem framing', 1,
  $tg$The slow elevator$tg$,
  $tg$Tenants complain the elevator is too slow. Speeding it up costs a fortune. Find a cheaper reframe — jot your angles.$tg$,
  $tg$["Is the complaint really “slow”, or “the wait is unpleasant”?","Change the experience, not the machine.","Give waiting people something to do."]$tg$::jsonb,
  $tg${"kind":"open","lenses":["Is 'slow' the real issue?","Machine or experience?","What's cheap?","What do people do while waiting?"],"keyAngles":[{"label":"It's perceived wait, not speed"},{"label":"Distract people (mirrors/screens)"},{"label":"Fix the experience, not the lift"}]}$tg$::jsonb,
  $tg${"kind":"open","keyAngles":[{"label":"It's perceived wait, not speed","pct":47,"lens":"Is 'slow' the real issue?","kw":["perceiv","wait","feel","boring","patience","seem","impatient"]},{"label":"Distract people (mirrors/screens)","pct":52,"lens":"What do people do while waiting?","kw":["mirror","screen","distract","music","phone","entertain","occupy","tv"]},{"label":"Fix the experience, not the lift","pct":39,"lens":"Machine or experience?","kw":["experience","not the lift","not speed","cheap","machine","design"]}]}$tg$::jsonb,
  $tg$Reframe from speed to perceived wait: mirrors or screens by the lift make the wait feel shorter, and complaints drop — for almost nothing.$tg$,
  $tg$🔄 Found the real problem behind today's. What's yours? →$tg$, 'live');
