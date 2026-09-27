// Third-round candidates: more George Carlin, more comedians and humorists,
// and Werner Herzog. The first one here is ID 701, and so on in order: keep
// the order stable once IDs have been exported.

export const FIRST_ID = 701;

const q = (author, text, source) => ({ author, text, source });

export const CANDIDATES = [
  // ─── George Carlin ──────────────────────────────────────────────────

  q(`George Carlin`, `Weather forecast for tonight: dark. Continued dark overnight, with widely scattered light by morning.`, `"Hippy-Dippy Weatherman," Take-Offs and Put-Ons (1967)`),
  q(`George Carlin`, `I'm always relieved when someone is delivering a eulogy and I realize I'm listening to it.`, `Napalm and Silly Putty (2001)`),
  q(`George Carlin`, `If it's true that our species is alone in the universe, then I'd have to say the universe aimed rather low and settled for very little.`, `When Will Jesus Bring the Pork Chops? (2004)`),
  q(`George Carlin`, `Electricity is really just organized lightning.`, `Brain Droppings (1997)`),
  q(`George Carlin`, `Frisbeetarianism is the belief that when you die, your soul goes up on the roof and gets stuck.`, `Brain Droppings (1997)`),
  q(`George Carlin`, `I put a dollar in one of those change machines. Nothing changed.`, `Brain Droppings (1997)`),
  q(`George Carlin`, `The planet isn't going anywhere. We are!`, `Jammin' in New York (1992)`),
  q(`George Carlin`, `I think it's the duty of the comedian to find out where the line is drawn and cross it deliberately.`, `As quoted in interviews (c. 2008)`),
  q(`George Carlin`, `Don't just teach your children to read. Teach them to question what they read. Teach them to question everything.`, `Attributed`),
  q(`George Carlin`, `May the forces of evil become confused on the way to your house.`, `His sign-off, as quoted in interviews`),

  // ─── Werner Herzog ──────────────────────────────────────────────────

  q(`Werner Herzog`, `Civilization is like a thin layer of ice upon a deep ocean of chaos and darkness.`, `Herzog on Herzog, edited by Paul Cronin (2002)`),
  q(`Werner Herzog`, `I believe the common denominator of the universe is not harmony, but chaos, hostility, and murder.`, `Grizzly Man (2005)`),
  q(`Werner Herzog`, `There are deeper strata of truth in cinema, and there is such a thing as poetic, ecstatic truth.`, `"Minnesota Declaration" (April 30, 1999)`),
  q(`Werner Herzog`, `Facts create norms, and truth illumination.`, `"Minnesota Declaration" (April 30, 1999)`),
  q(`Werner Herzog`, `I set off on the most direct route to Paris, in full faith, believing that she would stay alive if I came on foot.`, `Of Walking in Ice, Martje Herzog and Alan Greenberg translation (1980)`),
  q(`Werner Herzog`, `The trees here are in misery, and the birds are in misery. I don't think they sing, they just screech in pain.`, `Burden of Dreams (1982)`),
  q(`Werner Herzog`, `Carry bolt cutters everywhere.`, `As quoted in Paul Cronin, Werner Herzog: A Guide for the Perplexed (2014)`),
  q(`Werner Herzog`, `Get used to the bear behind you.`, `As quoted in Paul Cronin, Werner Herzog: A Guide for the Perplexed (2014)`),
  q(`Werner Herzog`, `Never wallow in your troubles; despair must be kept private and brief.`, `As quoted in Paul Cronin, Werner Herzog: A Guide for the Perplexed (2014)`),
  q(`Werner Herzog`, `I would travel down to hell and wrestle a film away from the devil if it was necessary.`, `Attributed`),
  q(`Werner Herzog`, `The world reveals itself to those who travel on foot.`, `Attributed`),
  q(`Werner Herzog`, `Look into the eyes of a chicken and you will see real stupidity.`, `Attributed; from an interview`),

  // ─── Stand-up ───────────────────────────────────────────────────────

  q(`Steven Wright`, `You can't have everything. Where would you put it?`, `I Have a Pony (1985)`),
  q(`Steven Wright`, `It's a small world, but I wouldn't want to paint it.`, `I Have a Pony (1985)`),
  q(`Steven Wright`, `I went to a general store. They wouldn't let me buy anything specific.`, `I Have a Pony (1985)`),

  q(`Mitch Hedberg`, `I'm sick of following my dreams, man. I'm just going to ask where they're going and hook up with 'em later.`, `Mitch All Together (2003)`),
  q(`Mitch Hedberg`, `I like rice. Rice is great if you're hungry and want 2,000 of something.`, `Mitch All Together (2003)`),
  q(`Mitch Hedberg`, `I'd like to get four people who do cartwheels very good, and make a cartwheel wagon.`, `Strategic Grill Locations (1999)`),

  q(`Steve Martin`, `A day without sunshine is like, you know, night.`, `A Wild and Crazy Guy (1978)`),

  q(`Lily Tomlin`, `Reality is the leading cause of stress among those in touch with it.`, `The Search for Signs of Intelligent Life in the Universe, written by Jane Wagner (1985)`),

  q(`Demetri Martin`, `I wonder what the most intelligent thing ever said was that started with the word "dude."`, `These Are Jokes (2006)`),

  q(`Rodney Dangerfield`, `I tell ya, I get no respect.`, `His catchphrase (from the 1960s)`),

  q(`Phyllis Diller`, `A smile is a curve that sets everything straight.`, `Attributed`),

  q(`George Burns`, `Happiness is having a large, loving, caring, close-knit family in another city.`, `Attributed`),
  q(`George Burns`, `You can't help getting older, but you don't have to get old.`, `Attributed`),

  q(`Victor Borge`, `Laughter is the shortest distance between two people.`, `Attributed`),

  q(`Jim Carrey`, `I think everybody should get rich and famous and do everything they ever dreamed of so they can see that it's not the answer.`, `As quoted in interviews (c. 2005)`),

  q(`Bill Murray`, `The more relaxed you are, the better you are at everything.`, `Attributed`),

  q(`Ricky Gervais`, `Just because you're offended, doesn't mean you're right.`, `As quoted in interviews`),

  q(`Tina Fey`, `You can't be that kid standing at the top of the waterslide, overthinking it. You have to go down the chute.`, `Bossypants (2011)`),

  q(`John Cleese`, `If you want creative workers, give them enough time to play.`, `Lecture on Creativity, Video Arts (1991)`),

  q(`Spike Milligan`, `All I ask is the chance to prove that money can't make me happy.`, `Attributed`),

  q(`Oscar Levant`, `There's a fine line between genius and insanity. I have erased this line.`, `Attributed`),

  q(`W. C. Fields`, `If at first you don't succeed, try, try again. Then quit. There's no point in being a damn fool about it.`, `Attributed`),

  // ─── Humorists and wits ─────────────────────────────────────────────

  q(`Jack Handey`, `If you ever drop your keys into a river of molten lava, let 'em go, because, man, they're gone.`, `Deep Thoughts (1992)`),
  q(`Jack Handey`, `I hope if dogs ever take over the world, and they chose a king, they don't just go by size, because I bet there are some Chihuahuas with some good ideas.`, `Deep Thoughts (1992)`),
  q(`Jack Handey`, `It takes a big man to cry, but it takes a bigger man to laugh at that man.`, `Deep Thoughts (1992)`),

  q(`Fran Lebowitz`, `Life is something to do when you can't get to sleep.`, `Metropolitan Life (1978)`),
  q(`Fran Lebowitz`, `Think before you speak. Read before you think.`, `The Fran Lebowitz Reader (1994)`),

  q(`Ambrose Bierce`, `Patience, n. A minor form of despair, disguised as a virtue.`, `The Devil's Dictionary (1911)`),
  q(`Ambrose Bierce`, `Calamities are of two kinds: misfortune to ourselves, and good fortune to others.`, `The Devil's Dictionary (1911)`),
  q(`Ambrose Bierce`, `Future, n. That period of time in which our affairs prosper, our friends are true and our happiness is assured.`, `The Devil's Dictionary (1911)`),

  q(`Stanisław Jerzy Lec`, `No snowflake in an avalanche ever feels responsible.`, `Unkempt Thoughts, Jacek Galazka translation (1962)`),
  q(`Stanisław Jerzy Lec`, `The first condition of immortality is death.`, `Unkempt Thoughts, Jacek Galazka translation (1962)`),

  q(`Kurt Vonnegut`, `I myself prefer to laugh, since there is less cleaning up to do afterward.`, `Palm Sunday (1981)`),

  q(`Dave Barry`, `You should not confuse your career with your life.`, `Dave Barry Turns 50 (1998)`),

  q(`Nora Ephron`, `Above all, be the heroine of your life, not the victim.`, `Commencement address at Wellesley College (June 3, 1996)`),

  q(`P. G. Wodehouse`, `I always advise people never to give advice.`, `Attributed`),

  q(`Douglas Adams`, `For a moment, nothing happened. Then, after a second or so, nothing continued to happen.`, `The Hitchhiker's Guide to the Galaxy (1979)`),

  q(`Terry Pratchett`, `Real stupidity beats artificial intelligence every time.`, `Hogfather (1996)`),
];
