import { pick, type Intensity, type VItem } from './types';

const key = (stage: Intensity, id: string, text: string, options: string[], follow: VItem['followUp'] = 'next'): VItem => ({
  ...pick('vault', id, text, options, follow),
  intensity: stage,
  stage,
});

/** 10. The Velvet Vault: one "key" question opens each stage, then the stage draws from its categories. */
export const VAULT = [
  key(1, 'vk-1-unlock', 'Stage one. Close your eyes for a second. Where do you want to feel my hands first?', ['Face and hair.', 'Waist and hips.', 'Back.', 'Thighs.']),
  key(1, 'vk-1-slow', 'Should tonight start slow?', ['Painfully slow.', 'Slow, then not.', 'Not slow at all.', 'You read me.']),
  key(1, 'vk-1-kiss', 'Before anything else, one kiss. Which kind?', ['Soft.', 'Deep.', 'Hungry.', 'Teasing.']),
  key(1, 'vk-1-look', 'Which part of me are you looking at right now?', ['Your eyes.', 'Your lips.', 'Your hands.', 'I am not telling.']),
  key(2, 'vk-2-unlock', 'Stage two. What turns you on fastest?', ['Words.', 'Touch.', 'Teasing.', 'Being wanted.']),
  key(2, 'vk-2-tease', 'How much teasing can you take tonight?', ['Not much.', 'Lots.', 'Until I beg.', 'Try me.']),
  key(2, 'vk-2-say', 'Tonight, I am allowed to say...', ['Anything.', 'Sweet things.', 'Filthy things.', 'Nothing. Just sounds.']),
  key(2, 'vk-2-touch', 'Gentle or firm, tonight?', ['Gentle.', 'Firm.', 'Gentle, then firm.', 'Surprise me.']),
  key(3, 'vk-3-unlock', 'Stage three. Honestly: what do you want more of?', ['More often.', 'Longer.', 'Wilder.', 'Newer.']),
  key(3, 'vk-3-secret', 'Are you ready to share something you have not said before?', ['Yes.', 'Almost.', 'Ask me gently.', 'Not tonight.'], 'comfort'),
  key(3, 'vk-3-lead', 'Tonight, who leads?', ['Me.', 'You.', 'We switch.', 'Coin toss.']),
  key(3, 'vk-3-new', 'One new thing, tonight?', ['Yes.', 'Maybe.', 'Next time.', 'Not tonight.'], 'conditions'),
  key(4, 'vk-4-unlock', 'Stage four. Pick tonight\'s fantasy setting.', ['A hotel suite.', 'A masquerade.', 'A storm and candlelight.', 'A private pool.'], 'scene'),
  key(4, 'vk-4-role', 'Pick your role.', ['A stranger.', 'In charge.', 'At your mercy.', 'Just me.'], 'scene'),
  key(4, 'vk-4-mood', 'The fantasy mood?', ['Slow and sensual.', 'Dark and intense.', 'Playful.', 'Forbidden-feeling.'], 'scene'),
  key(4, 'vk-4-end', 'How does the fantasy end?', ['Tangled up together.', 'Round two.', 'A shower.', 'It does not.'], 'scene'),
  key(5, 'vk-5-unlock', 'Final stage. Which door do you want to open first?', ['Blindfolds.', 'Restraint.', 'Power.', 'Words.'], 'conditions'),
  key(5, 'vk-5-word', 'Before we go further: our stop word is...', ['Something silly.', 'Red, yellow, green.', 'A hand squeeze.', 'Just "stop".']),
  key(5, 'vk-5-boldest', 'How bold are you feeling?', ['Very.', 'Bold enough.', 'A little nervous.', 'Ask me gently.'], 'comfort'),
  key(5, 'vk-5-promise', 'Whatever we answer in here...', ['Stays a fantasy.', 'Might happen, if we both say yes.', 'We talk about it tomorrow.', 'Our secret either way.']),
];
