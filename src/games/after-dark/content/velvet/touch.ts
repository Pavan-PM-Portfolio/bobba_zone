import { pick } from './types';

const t = (id: string, text: string, options: string[], follow: Parameters<typeof pick>[4] = 'draw', extra: { picks?: 1 | 2; setup?: string; intensity?: 1 | 2 | 3 | 4 | 5 } = {}) =>
  pick('body', id, text, options, follow, { intensity: extra.intensity ?? 3, picks: extra.picks, setup: extra.setup });

/** Body Map, deeper: touch, skin, closeness and the most intimate moments together. */
export const TOUCH = [
  // Hands and skin
  t('tm-fingertips', 'My fingertips trace a slow line from your collarbone downwards. Where do you want me to stop?', ['Your chest.', 'Your stomach.', 'Just above your waistband.', 'Do not stop.'], 'pace'),
  t('tm-palm-flat', 'My whole hand, warm and flat, rests on your skin. Where?', ['The small of your back.', 'Your stomach.', 'Your chest, over your heart.', 'Your inner thigh.']),
  t('tm-nails-light', 'Nails, barely touching, dragged slowly along your skin. Where do you want them?', ['Down your back.', 'Up your inner arms.', 'Along your thighs.', 'Across your stomach.'], 'learned'),
  t('tm-goosebumps', 'What gives you goosebumps fastest?', ['Breath on my neck.', 'Fingertips on my spine.', 'Lips behind my ear.', 'A hand sliding up my thigh.'], 'learned'),
  t('tm-thumb', 'My thumb on your lower lip. What happens next?', ['I kiss it.', 'I bite it, gently.', 'I pull you in.', 'I hold still and let you decide.']),
  t('tm-hips-grip', 'My hands on your hips. How do you want them?', ['Light, just resting there.', 'Firm, pulling you against me.', 'Guiding how you move.', 'Sliding slowly lower.'], 'say'),
  t('tm-waistband', 'My fingers hook into your waistband. How long do you want me to wait?', ['Not at all.', 'A few slow seconds.', 'Until you ask.', 'Make me beg.'], 'pace', { intensity: 4 }),
  t('tm-face-hold', 'I hold your face in both hands before I kiss you. How does it feel?', ['Like melting.', 'Like being completely wanted.', 'Intense, in the best way.', 'I want to do it to you.']),
  t('tm-hand-guide', 'You take my hand and guide it. Where do you put it first?', ['On my neck.', 'On my chest.', 'On my thigh.', 'Somewhere I will not say out loud.'], 'learn-me', { intensity: 4 }),
  t('tm-two-hands', 'Choose two places for my hands right now. Choose up to 2.', ['Your hair.', 'Your waist.', 'Your back.', 'Your thighs.'], 'next', { picks: 2 }),

  // Lips and breath
  t('tm-breath', 'My breath, warm and slow, just above your skin, never touching. Where?', ['Along your neck.', 'Across your chest.', 'Down your stomach.', 'Along your inner thighs.'], 'pace', { intensity: 4 }),
  t('tm-kiss-trail', 'I kiss a slow trail down your body. How far do you let me go before you pull me back up?', ['Not far. I want your mouth on mine.', 'To your stomach.', 'Further.', 'I do not pull you back up.'], 'pace', { intensity: 4 }),
  t('tm-kiss-spine', 'Kisses all the way down your spine, one vertebra at a time. Your reaction?', ['I arch into every one.', 'I shiver and hold my breath.', 'I roll over halfway.', 'I make you start again from the top.']),
  t('tm-ear', 'My lips at your ear. What do you want to hear?', ['My name.', 'What I am about to do.', 'How good you feel.', 'Just my breathing.'], 'say'),
  t('tm-collarbone', 'Your collarbone: kissed, bitten, or traced with a fingertip?', ['Kissed.', 'Bitten, gently.', 'Traced.', 'All three, in that order.']),
  t('tm-wrist-kiss', 'I kiss the inside of your wrist, then work my way slowly up your arm. Where should I end up?', ['My neck.', 'My lips.', 'My shoulder.', 'Somewhere much lower.'], 'pace'),
  t('tm-lower-lip', 'A kiss that catches your lower lip between my teeth. Yes?', ['Yes.', 'Yes, softly.', 'I want to do it to you.', 'No biting.'], 'settled'),
  t('tm-slowest-kiss', 'The slowest kiss we have ever had. How long does it last?', ['A minute.', 'Five minutes.', 'Until one of us breaks.', 'All night, on and off.']),

  // Closeness and bodies together
  t('tm-skin-to-skin', 'Skin to skin, nothing between us. Which moment do you love most?', ['The first second our bodies touch.', 'Lying still, just feeling each other.', 'Your weight on top of me.', 'Wrapped around each other afterwards.'], 'draw', { intensity: 4 }),
  t('tm-weight', 'How do you feel about your partner\'s full weight on you?', ['Love it. Pin me down.', 'Love it, for a while.', 'I prefer being on top.', 'Not my favourite.'], 'settled', { intensity: 4 }),
  t('tm-spooning', 'Spooning, your partner pressed against your back. What do you want?', ['To drift off like this.', 'Their hand sliding slowly across my stomach.', 'Kisses on my neck.', 'To turn around.'], 'when', { intensity: 4 }),
  t('tm-lap', 'You are sitting in my lap, facing me. What happens?', ['Slow, deep kissing.', 'My hands under your shirt.', 'You rock slowly against me.', 'We do not stay sitting for long.'], 'draw', { intensity: 4 }),
  t('tm-forehead', 'Foreheads together, eyes closed, breathing together. When do you want this?', ['Before we start.', 'In the middle, when everything slows down.', 'At the very end.', 'All the time.'], 'when'),
  t('tm-heartbeat', 'Your ear on my chest, hearing my heart race because of you. How does that feel?', ['Incredibly intimate.', 'Hot. I want to make it race faster.', 'Grounding.', 'I want you to hear mine.']),
  t('tm-tangle', 'Legs tangled, bodies pressed together. Which is more intimate to you?', ['Being completely still like this.', 'Moving slowly together.', 'Holding eye contact.', 'Whispering to each other.']),
  t('tm-from-behind', 'I come up behind you while you are getting dressed and pull you back against me. What do you do?', ['Lean back into me.', 'Keep getting dressed, very slowly.', 'Turn around and undress again.', 'Take my hands and put them where I want.'], 'draw', { intensity: 4 }),

  // Most intimate moments
  t('tm-eyes-during', 'In the most intimate moment, where do you want my eyes?', ['Locked on yours.', 'On your body.', 'Closed, so I just feel you.', 'On your face as you lose control.'], 'say', { intensity: 5 }),
  t('tm-hold-hands-during', 'Holding hands, fingers laced, in the most intense moment. Yes?', ['Yes, always.', 'Pinned above my head.', 'Only at the very end.', 'I want my hands free.'], 'settled', { intensity: 5 }),
  t('tm-name', 'At the moment you lose yourself, what do you want to hear?', ['My name.', '"I love you."', '"Look at me."', 'Nothing. Just how you sound.'], 'say', { intensity: 5 }),
  t('tm-closest', 'When do you feel closest to me physically?', ['Face to face, slow, eyes open.', 'When you are holding me down.', 'Lying still together afterwards.', 'Waking up tangled together.'], 'draw', { intensity: 5 }),
  t('tm-slow-everything', 'A night where everything is slow: kissing, touching, undressing, everything. How do you feel?', ['That is my dream night.', 'Hot, if I am allowed one fast moment.', 'I would last ten minutes.', 'I would make you go slower still.'], 'pace', { intensity: 5 }),
  t('tm-whisper-close', 'Pressed together, my lips at your ear. Choose the whisper. Choose up to 2.', ['"You feel incredible."', '"Don\'t stop."', '"I\'m yours."', '"Slower."'], 'say', { picks: 2, intensity: 5 }),
  t('tm-after-close', 'Right afterwards, what is the most intimate thing I could do?', ['Hold you without saying anything.', 'Kiss you slowly, all over again.', 'Tell you exactly what you just did to me.', 'Stroke your hair until you drift off.'], 'draw', { intensity: 4 }),
  t('tm-aftercare', 'After an intense night, what do you need?', ['To be held tightly.', 'Water, a blanket and you.', 'Gentle words.', 'A warm shower together.'], 'settled', { intensity: 4 }),
  t('tm-again-slow', 'Round two is always...', ['Slower.', 'More intense.', 'More tender.', 'Wherever you lead.'], 'pace', { intensity: 5 }),

  // Scenes with touch
  t('tm-scene-bed', 'Is this tempo right for you?', ['Exactly right.', 'Slower still.', 'I would already be pulling you down.', 'I would turn the tables.'], 'pace', {
    intensity: 5,
    setup: 'You lie back on the bed. Your partner kneels over you and, without kissing you yet, slowly runs their hands up from your ankles, over your knees, along your thighs, across your hips and stomach, up to your face. Only then do they lean down.',
  }),
  t('tm-scene-oil', 'What do you want their hands to do next?', ['Keep going exactly like this.', 'Go lower.', 'Turn me over.', 'Stop teasing.'], 'pace', {
    intensity: 5,
    setup: 'Warm oil on your back. Long, slow strokes from your shoulders down to the base of your spine, each one ending a little lower than the last. Your partner leans down and whispers that they are in no hurry at all.',
  }),
  t('tm-scene-mirror', 'What do you want to see?', ['Their hands on me.', 'My face as it happens.', 'Their face watching me.', 'Nothing. I close my eyes.'], 'comfort', {
    intensity: 5,
    setup: 'You stand in front of a mirror. Your partner stands behind you, their body pressed against your back, their hands slowly moving over you while you both watch.',
  }),
  t('tm-scene-blindfold', 'Where do you hope their hands go first?', ['My neck.', 'My chest.', 'My thighs.', 'I hope they make me wait.'], 'pace', {
    intensity: 5,
    setup: 'Blindfolded, you can feel the warmth of your partner beside you but they are not touching you. Seconds pass. You can hear them breathing. Then the lightest touch, and it is not where you expected.',
  }),
  t('tm-scene-shower', 'What is the most intimate part?', ['Washing each other slowly.', 'Their body pressed against mine under the water.', 'Kissing with water running over us.', 'Being dried off afterwards.'], 'draw', {
    intensity: 4,
    setup: 'Steam, warm water, and your partner standing close. They take the soap and start with your shoulders, moving slowly, carefully, as if they have all the time in the world.',
  }),
  t('tm-scene-morning', 'How does this morning go?', ['Slowly, still half in the covers.', 'Their hand keeps going.', 'I turn around and pull them on top of me.', 'I make them wait until after coffee.'], 'when', {
    intensity: 5,
    setup: 'Morning light. You wake up with your partner\'s body warm against your back and their hand resting on your stomach. As you stir, their fingers start to move, slowly, lazily, with clear intent.',
  }),
];
