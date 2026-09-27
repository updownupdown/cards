// Second-round candidates: comedians, modern writers, musicians, filmmakers,
// game designers, programmers, designers, athletes and others the first
// round left out. The first one here is ID 501, and so on in order: keep the
// order stable once IDs have been exported.

const q = (author, text, source) => ({ author, text, source });

export const ROUND_2 = [
  // ─── Comedians ──────────────────────────────────────────────────────

  q(`George Carlin`, `Have you ever noticed that anybody driving slower than you is an idiot, and anyone going faster than you is a maniac?`, `A Place for My Stuff (1981)`),
  q(`George Carlin`, `Think of how stupid the average person is, and realize half of them are stupider than that.`, `Doin' It Again (1990)`),
  q(`George Carlin`, `Just 'cause you got the monkey off your back doesn't mean the circus has left town.`, `Napalm and Silly Putty (2001)`),
  q(`George Carlin`, `Scratch any cynic and you will find a disappointed idealist.`, `Interview, as widely quoted (c. 1990s)`),
  q(`George Carlin`, `The very existence of flamethrowers proves that sometime, somewhere, someone said to themselves, "You know, I want to set those people over there on fire, but I'm just not close enough to get the job done."`, `Brain Droppings (1997)`),

  q(`Groucho Marx`, `I don't want to belong to any club that will accept me as a member.`, `Telegram to the Friars' Club, as told in Groucho and Me (1959)`),
  q(`Groucho Marx`, `Outside of a dog, a book is man's best friend. Inside of a dog it's too dark to read.`, `Attributed (c. 1954)`),

  q(`Mitch Hedberg`, `An escalator can never break: it can only become stairs.`, `Mitch All Together (2003)`),
  q(`Mitch Hedberg`, `I haven't slept for ten days, because that would be too long.`, `Strategic Grill Locations (1999)`),

  q(`Steven Wright`, `I have a large seashell collection, which I keep scattered on the beaches all over the world.`, `I Have a Pony (1985)`),
  q(`Steven Wright`, `Everywhere is within walking distance if you have the time.`, `I Have a Pony (1985)`),

  q(`Robin Williams`, `You're only given a little spark of madness. You mustn't lose it.`, `Live at the Roxy (1978)`),

  q(`Bill Hicks`, `The world is like a ride in an amusement park, and when you choose to go on it you think it's real, because that's how powerful our minds are.`, `Revelations (1993)`),
  q(`Bill Hicks`, `It's just a ride. And we can change it any time we want. It's only a choice.`, `Revelations (1993)`),

  q(`Tina Fey`, `Say yes, and you'll figure it out afterward.`, `Bossypants (2011)`),
  q(`Amy Poehler`, `Great people do things before they're ready.`, `Yes Please (2014)`),

  q(`John Cleese`, `Creativity is not a talent. It is a way of operating.`, `Lecture on Creativity, Video Arts (1991)`),

  q(`Charlie Chaplin`, `Life is a tragedy when seen in close-up, but a comedy in long-shot.`, `As quoted in his obituary, The Guardian (December 28, 1977)`),

  q(`Jerry Seinfeld`, `According to most studies, people's number one fear is public speaking. Number two is death. This means to the average person, if you go to a funeral, you're better off in the casket than doing the eulogy.`, `Seinfeld, stand-up opening (1993)`),

  q(`Lily Tomlin`, `All my life, I always wanted to be somebody. Now I see that I should have been more specific.`, `The Search for Signs of Intelligent Life in the Universe, written by Jane Wagner (1985)`),

  q(`Conan O'Brien`, `Work hard, be kind, and amazing things will happen.`, `Final episode of The Tonight Show (January 22, 2010)`),
  q(`Stephen Colbert`, `Cynicism masquerades as wisdom, but it is the farthest thing from it.`, `Commencement address at Knox College (June 3, 2006)`),

  q(`Gilda Radner`, `Life is about not knowing, having to change, taking the moment and making the best of it, without knowing what's going to happen next. Delicious ambiguity.`, `It's Always Something (1989)`),

  q(`Steve Martin`, `Be so good they can't ignore you.`, `Interview on Charlie Rose (December 2007)`),

  q(`Mel Brooks`, `Tragedy is when I cut my finger. Comedy is when you fall into an open sewer and die.`, `As quoted in The New Yorker (October 30, 1978)`),

  q(`Emo Philips`, `I used to think that the brain was the most wonderful organ in my body. Then I realized who was telling me this.`, `Stand-up routine (1980s)`),

  q(`Eric Idle`, `Always look on the bright side of life.`, `Song in Monty Python's Life of Brian (1979)`),

  q(`Will Rogers`, `Even if you are on the right track, you'll get run over if you just sit there.`, `Attributed (c. 1930s)`),

  q(`Dorothy Parker`, `The cure for boredom is curiosity. There is no cure for curiosity.`, `Attributed`),

  q(`Erma Bombeck`, `If life is a bowl of cherries, what am I doing in the pits?`, `If Life Is a Bowl of Cherries, What Am I Doing in the Pits? (1978)`),

  // ─── Modern fiction and fantasy ─────────────────────────────────────

  q(`Douglas Adams`, `Time is an illusion. Lunchtime doubly so.`, `The Hitchhiker's Guide to the Galaxy (1979)`),
  q(`Douglas Adams`, `I love deadlines. I love the whooshing noise they make as they go by.`, `The Salmon of Doubt (2002)`),
  q(`Douglas Adams`, `I may not have gone where I intended to go, but I think I have ended up where I needed to be.`, `The Long Dark Tea-Time of the Soul (1988)`),
  q(`Douglas Adams`, `The ships hung in the sky in much the same way that bricks don't.`, `The Hitchhiker's Guide to the Galaxy (1979)`),

  q(`Terry Pratchett`, `The trouble with having an open mind, of course, is that people will insist on coming along and trying to put things in it.`, `Diggers (1990)`),
  q(`Terry Pratchett`, `It is often said that before you die your life passes before your eyes. It is in fact true. It's called living.`, `The Last Continent (1998)`),
  q(`Terry Pratchett`, `Light thinks it travels faster than anything but it is wrong. No matter how fast light travels, it finds the darkness has always got there first, and is waiting for it.`, `Reaper Man (1991)`),

  q(`Neil Gaiman`, `Fairy tales are more than true: not because they tell us that dragons exist, but because they tell us that dragons can be beaten.`, `Coraline, epigraph after G. K. Chesterton (2002)`),
  q(`Neil Gaiman`, `Make good art.`, `Commencement address at the University of the Arts (May 17, 2012)`),

  q(`Kurt Vonnegut`, `I urge you to please notice when you are happy, and exclaim or murmur or think at some point, "If this isn't nice, I don't know what is."`, `A Man Without a Country (2005)`),
  q(`Kurt Vonnegut`, `We are here on Earth to fart around, and don't let anybody tell you different.`, `A Man Without a Country (2005)`),
  q(`Kurt Vonnegut`, `So it goes.`, `Slaughterhouse-Five (1969)`),

  q(`Ray Bradbury`, `We are cups, constantly and quietly being filled. The trick is, knowing how to tip ourselves over and let the beautiful stuff out.`, `Zen in the Art of Writing (1990)`),

  q(`Isaac Asimov`, `Violence is the last refuge of the incompetent.`, `Foundation (1951)`),
  q(`Isaac Asimov`, `The saddest aspect of life right now is that science gathers knowledge faster than society gathers wisdom.`, `Isaac Asimov's Book of Science and Nature Quotations (1988)`),

  q(`Arthur C. Clarke`, `Any sufficiently advanced technology is indistinguishable from magic.`, `Profiles of the Future, revised edition (1973)`),
  q(`Arthur C. Clarke`, `The only way of discovering the limits of the possible is to venture a little way past them into the impossible.`, `Profiles of the Future (1962)`),

  q(`Philip K. Dick`, `Reality is that which, when you stop believing in it, doesn't go away.`, `"How to Build a Universe That Doesn't Fall Apart Two Days Later" (1978)`),

  q(`Ursula K. Le Guin`, `The creative adult is the child who has survived.`, `Attributed; as quoted in interviews`),

  q(`Italo Calvino`, `Seek and learn to recognize who and what, in the midst of the inferno, are not inferno, then make them endure, give them space.`, `Invisible Cities, William Weaver translation (1974)`),
  q(`Italo Calvino`, `A classic is a book that has never finished saying what it has to say.`, `"Why Read the Classics?" (1981)`),

  q(`Milan Kundera`, `The struggle of man against power is the struggle of memory against forgetting.`, `The Book of Laughter and Forgetting, Michael Henry Heim translation (1980)`),

  q(`Umberto Eco`, `The list is the origin of culture.`, `Interview with Der Spiegel (November 11, 2009)`),

  q(`Haruki Murakami`, `If you only read the books that everyone else is reading, you can only think what everyone else is thinking.`, `Norwegian Wood, Jay Rubin translation (2000)`),

  q(`Tove Jansson`, `All things are so very uncertain, and that's exactly what makes me feel reassured.`, `Moominland Midwinter, Thomas Warburton translation (1958)`),

  q(`Michael Ende`, `You must never think of the whole street at once, understand? You must only concentrate on the next step, the next breath, the next stroke of the broom.`, `Momo, J. Maxwell Brownjohn translation (1984)`),

  q(`Ernest Hemingway`, `The world breaks every one and afterward many are strong at the broken places.`, `A Farewell to Arms (1929)`),

  q(`John Steinbeck`, `And now that you don't have to be perfect, you can be good.`, `East of Eden (1952)`),

  q(`Harper Lee`, `You never really understand a person until you consider things from his point of view - until you climb into his skin and walk around in it.`, `To Kill a Mockingbird (1960)`),

  q(`George Orwell`, `To see what is in front of one's nose needs a constant struggle.`, `"In Front of Your Nose" (1946)`),

  q(`Aldous Huxley`, `Experience is not what happens to a man; it is what a man does with what happens to him.`, `Texts and Pretexts (1932)`),

  q(`Sylvia Plath`, `I took a deep breath and listened to the old brag of my heart. I am, I am, I am.`, `The Bell Jar (1963)`),

  q(`Anaïs Nin`, `Life shrinks or expands in proportion to one's courage.`, `The Diary of Anaïs Nin, Volume 3 (1941 entry)`),

  q(`G. K. Chesterton`, `The world will never starve for want of wonders; but only for want of wonder.`, `Tremendous Trifles (1909)`),

  q(`Madeleine L'Engle`, `You have to write the book that wants to be written.`, `Interview, as quoted in Madeleine L'Engle Herself (2001)`),

  q(`Chimamanda Ngozi Adichie`, `The single story creates stereotypes, and the problem with stereotypes is not that they are untrue, but that they are incomplete.`, `"The Danger of a Single Story," TED talk (July 2009)`),

  q(`Arundhati Roy`, `Another world is not only possible, she is on her way. On a quiet day, I can hear her breathing.`, `Speech at the World Social Forum, Porto Alegre (January 27, 2003)`),

  // ─── Essays and non-fiction ─────────────────────────────────────────

  q(`Rebecca Solnit`, `Hope is an embrace of the unknown and the unknowable.`, `Hope in the Dark (2004)`),

  q(`Susan Sontag`, `Do stuff. Be clenched, curious. Not waiting for inspiration's shove or society's kiss on your forehead. Pay attention. It's all about paying attention.`, `Commencement address at Vassar College (May 2003)`),

  q(`Joan Didion`, `We tell ourselves stories in order to live.`, `The White Album (1979)`),

  q(`David Foster Wallace`, `The most obvious, important realities are often the ones that are hardest to see and talk about.`, `"This Is Water," Kenyon College commencement address (May 21, 2005)`),

  q(`Douglas Hofstadter`, `Hofstadter's Law: It always takes longer than you expect, even when you take into account Hofstadter's Law.`, `Gödel, Escher, Bach (1979)`),

  q(`Marshall McLuhan`, `The medium is the message.`, `Understanding Media (1964)`),
  q(`Marshall McLuhan`, `There are no passengers on spaceship earth. We are all crew.`, `As quoted in Anne Frank Foundation lectures (1965)`),

  q(`Daniel Kahneman`, `Nothing in life is as important as you think it is, while you are thinking about it.`, `Thinking, Fast and Slow (2011)`),

  q(`Herbert A. Simon`, `A wealth of information creates a poverty of attention.`, `"Designing Organizations for an Information-Rich World" (1971)`),

  q(`John Maynard Keynes`, `The difficulty lies, not in the new ideas, but in escaping from the old ones.`, `The General Theory of Employment, Interest and Money, Preface (1936)`),

  q(`Peter Drucker`, `There is nothing so useless as doing efficiently that which should not be done at all.`, `"Managing for Business Effectiveness," Harvard Business Review (1963)`),

  q(`Raymond Smullyan`, `Some people are always critical of vague statements. I tend rather to be critical of precise statements; they are the only ones which can correctly be labeled "wrong."`, `5000 B.C. and Other Philosophical Fantasies (1983)`),

  q(`Daniel Dennett`, `There's nothing I like less than bad arguments for a view that I hold dear.`, `Intuition Pumps and Other Tools for Thinking (2013)`),

  q(`Brené Brown`, `Vulnerability is the birthplace of innovation, creativity and change.`, `"Listening to Shame," TED talk (March 2012)`),

  q(`Ira Glass`, `It's only by going through a volume of work that you will close that gap, and your work will be as good as your ambitions.`, `Interview on Public Radio International (2009)`),

  // ─── Poets ──────────────────────────────────────────────────────────

  q(`Robert Frost`, `The best way out is always through.`, `"A Servant to Servants," North of Boston (1914)`),
  q(`Robert Frost`, `Two roads diverged in a wood, and I -
I took the one less traveled by,
And that has made all the difference.`, `"The Road Not Taken" (1916)`),

  q(`T. S. Eliot`, `We shall not cease from exploration
And the end of all our exploring
Will be to arrive where we started
And know the place for the first time.`, `"Little Gidding," Four Quartets (1942)`),

  q(`Langston Hughes`, `Hold fast to dreams
For if dreams die
Life is a broken-winged bird
That cannot fly.`, `"Dreams" (1923)`),

  q(`W. B. Yeats`, `Tread softly because you tread on my dreams.`, `"He Wishes for the Cloths of Heaven" (1899)`),

  q(`W. H. Auden`, `We must love one another or die.`, `"September 1, 1939" (1939)`),

  q(`Wisława Szymborska`, `I prefer the absurdity of writing poems
to the absurdity of not writing poems.`, `"Possibilities," Stanisław Barańczak and Clare Cavanagh translation (1995)`),

  q(`Seamus Heaney`, `Walk on air against your better judgement.`, `Nobel Lecture, "Crediting Poetry" (December 7, 1995)`),

  q(`Amanda Gorman`, `For there is always light,
if only we're brave enough to see it.
If only we're brave enough to be it.`, `"The Hill We Climb" (January 20, 2021)`),

  // ─── Children's books and cartoons ──────────────────────────────────

  q(`Dr. Seuss`, `Today you are You, that is truer than true.
There is no one alive who is Youer than You.`, `Happy Birthday to You! (1959)`),
  q(`Dr. Seuss`, `Unless someone like you cares a whole awful lot,
nothing is going to get better. It's not.`, `The Lorax (1971)`),
  q(`Dr. Seuss`, `Oh, the thinks you can think!`, `Oh, the Thinks You Can Think! (1975)`),

  q(`A. A. Milne`, `Doing nothing means going along, listening to all the things you can't hear, and not bothering.`, `The House at Pooh Corner, Chapter X (1928)`),

  q(`Roald Dahl`, `And above all, watch with glittering eyes the whole world around you because the greatest secrets are always hidden in the most unlikely places. Those who don't believe in magic will never find it.`, `The Minpins (1991)`),

  q(`Shel Silverstein`, `Listen to the MUSTN'TS, child,
Listen to the DON'TS
Listen to the SHOULDN'TS
The IMPOSSIBLES, the WON'TS
Listen to the NEVER HAVES
Then listen close to me -
Anything can happen, child,
ANYTHING can be.`, `Where the Sidewalk Ends (1974)`),

  q(`Astrid Lindgren`, `I have never tried that before, so I think I should definitely be able to do that.`, `Pippi Longstocking, as commonly translated (1945)`),

  q(`Charles M. Schulz`, `Happiness is a warm puppy.`, `Peanuts (April 25, 1960)`),

  q(`Bill Watterson`, `It's a magical world, Hobbes, ol' buddy... Let's go exploring!`, `Calvin and Hobbes, final strip (December 31, 1995)`),
  q(`Bill Watterson`, `There's never enough time to do all the nothing you want.`, `Calvin and Hobbes (1992)`),

  q(`Fred Rogers`, `When I was a boy and I would see scary things in the news, my mother would say to me, "Look for the helpers. You will always find people who are helping."`, `Mister Rogers Talks with Parents (1983)`),
  q(`Fred Rogers`, `Play is often talked about as if it were a relief from serious learning. But for children play is serious learning.`, `Attributed`),

  q(`Jim Henson`, `[Kids] don't remember what you try to teach them. They remember what you are.`, `As quoted in It's Not Easy Being Green (2005)`),

  // ─── Music ──────────────────────────────────────────────────────────

  q(`Leonard Cohen`, `There is a crack in everything,
That's how the light gets in.`, `"Anthem," The Future (1992)`),

  q(`Bob Dylan`, `He not busy being born is busy dying.`, `"It's Alright, Ma (I'm Only Bleeding)" (1965)`),

  q(`Joni Mitchell`, `Don't it always seem to go
That you don't know what you've got
Till it's gone.`, `"Big Yellow Taxi" (1970)`),

  q(`Bob Marley`, `Emancipate yourselves from mental slavery;
None but ourselves can free our minds.`, `"Redemption Song" (1980), after Marcus Garvey`),

  q(`David Bowie`, `Always go a little further into the water than you feel you're capable of being in. Go a little bit out of your depth.`, `Interview in the documentary Inspirations (1997)`),

  q(`Frank Zappa`, `Without deviation from the norm, progress is not possible.`, `Attributed`),

  q(`Brian Eno`, `Honor thy error as a hidden intention.`, `Oblique Strategies, with Peter Schmidt (1975)`),

  q(`Louis Armstrong`, `If you have to ask what jazz is, you'll never know.`, `Attributed`),

  q(`Thelonious Monk`, `The piano ain't got no wrong notes.`, `Attributed`),

  q(`Miles Davis`, `Do not fear mistakes. There are none.`, `Attributed`),

  q(`Dolly Parton`, `Find out who you are and do it on purpose.`, `As quoted in interviews`),
  q(`Dolly Parton`, `If you want the rainbow, you gotta put up with the rain.`, `As quoted in interviews`),

  // ─── Film and animation ─────────────────────────────────────────────

  q(`Hayao Miyazaki`, `You must see with eyes unclouded by hate.`, `Princess Mononoke (1997)`),

  q(`Akira Kurosawa`, `To be an artist means never to avert one's eyes.`, `Something Like an Autobiography, Audie E. Bock translation (1982)`),

  q(`Agnès Varda`, `If we opened people up, we'd find landscapes.`, `The Beaches of Agnès (2008)`),

  q(`Werner Herzog`, `Walking is virtue, tourism is deadly sin.`, `Of Walking in Ice (1978)`),

  q(`Stanley Kubrick`, `However vast the darkness, we must supply our own light.`, `Interview in Playboy (September 1968)`),

  q(`Orson Welles`, `If you want a happy ending, that depends, of course, on where you stop your story.`, `The Big Brass Ring, screenplay (1982)`),

  // ─── Games and play ─────────────────────────────────────────────────

  q(`Sid Meier`, `A game is a series of interesting decisions.`, `Game Developers Conference (1989)`),

  q(`Raph Koster`, `Fun is just another word for learning.`, `A Theory of Fun for Game Design (2004)`),

  q(`Satoru Iwata`, `On my business card, I am a corporate president. In my mind, I am a game developer. But in my heart, I am a gamer.`, `Keynote at the Game Developers Conference (March 10, 2005)`),

  q(`Shigeru Miyamoto`, `A delayed game is eventually good, but a rushed game is forever bad.`, `Attributed`),

  q(`Nolan Bushnell`, `All the best games are easy to learn and difficult to master.`, `"Bushnell's Law" (1970s)`),

  q(`Iwamoto Kaoru`, `Go uses the most elemental materials and concepts - line and circle, wood and stone, black and white - combining them with simple rules to generate subtle strategies and complex tactics that stagger the imagination.`, `Go for Beginners (1972)`),

  q(`Savielly Tartakower`, `The winner of the game is the player who makes the next-to-last mistake.`, `Attributed`),

  q(`Mikhail Tal`, `You must take your opponent into a deep dark forest where 2+2=5, and the path leading out is only wide enough for one.`, `Attributed`),

  q(`José Raúl Capablanca`, `You may learn much more from a game you lose than from a game you win.`, `Attributed`),

  q(`Bobby Fischer`, `Chess is life.`, `As quoted in Frank Brady, Profile of a Prodigy (1965)`),

  q(`Jane McGonigal`, `A good game is a unique way of structuring experience and provoking positive emotion.`, `Reality Is Broken (2011)`),

  // ─── Mathematics ────────────────────────────────────────────────────

  q(`Benoit Mandelbrot`, `Clouds are not spheres, mountains are not cones, coastlines are not circles, and bark is not smooth, nor does lightning travel in a straight line.`, `The Fractal Geometry of Nature (1982)`),

  q(`Maryam Mirzakhani`, `The beauty of mathematics only shows itself to more patient followers.`, `Interview, Clay Mathematics Institute Annual Report (2008)`),

  q(`Paul Erdős`, `Another roof, another proof.`, `Attributed; as recalled by colleagues`),

  // ─── Science and space ──────────────────────────────────────────────

  q(`E. O. Wilson`, `The real problem of humanity is the following: we have paleolithic emotions; medieval institutions; and god-like technology.`, `Debate at the Harvard Museum of Natural History (September 9, 2009)`),

  q(`Richard Dawkins`, `We are going to die, and that makes us the lucky ones. Most people are never going to die because they are never going to be born.`, `Unweaving the Rainbow (1998)`),

  q(`Stephen Jay Gould`, `I am, somehow, less interested in the weight and convolutions of Einstein's brain than in the near certainty that people of equal talent have lived and died in cotton fields and sweatshops.`, `The Panda's Thumb (1980)`),

  q(`Freeman Dyson`, `The more I examine the universe and study the details of its architecture, the more evidence I find that the universe in some sense must have known that we were coming.`, `Disturbing the Universe (1979)`),

  q(`Lynn Margulis`, `Life did not take over the globe by combat, but by networking.`, `Microcosmos, with Dorion Sagan (1986)`),

  q(`Neil deGrasse Tyson`, `The universe is under no obligation to make sense to you.`, `As quoted in interviews (c. 2011)`),

  q(`Mae Jemison`, `Don't let anyone rob you of your imagination, your creativity, or your curiosity. It's your place in the world; it's your life.`, `Attributed`),

  q(`Yuri Gagarin`, `Orbiting Earth in the spaceship, I saw how beautiful our planet is. People, let us preserve and increase this beauty, not destroy it!`, `After the flight of Vostok 1 (April 1961)`),

  q(`William Anders`, `We came all this way to explore the moon, and the most important thing is that we discovered the Earth.`, `Attributed, on Apollo 8 (1968)`),

  // ─── Computing ──────────────────────────────────────────────────────

  q(`Alan Kay`, `The best way to predict the future is to invent it.`, `Meeting at Xerox PARC (1971)`),

  q(`Donald Knuth`, `Beware of bugs in the above code; I have only proved it correct, not tried it.`, `Memo to Peter van Emde Boas (March 29, 1977)`),
  q(`Donald Knuth`, `Premature optimization is the root of all evil.`, `"Structured Programming with go to Statements" (1974)`),

  q(`Edsger W. Dijkstra`, `Simplicity is prerequisite for reliability.`, `EWD498, "How do we tell truths that might hurt?" (1975)`),
  q(`Edsger W. Dijkstra`, `The question of whether a computer can think is no more interesting than the question of whether a submarine can swim.`, `"The Threats to Computing Science," EWD898 (1984)`),

  q(`Grace Hopper`, `The most dangerous phrase in the language is, "We've always done it this way."`, `As quoted in Computerworld (1976)`),
  q(`Grace Hopper`, `It's easier to ask forgiveness than it is to get permission.`, `As quoted in the Chips Ahoy column, Navy News (July 1986)`),

  q(`Linus Torvalds`, `Talk is cheap. Show me the code.`, `Linux kernel mailing list (August 25, 2000)`),

  q(`Fred Brooks`, `Adding manpower to a late software project makes it later.`, `The Mythical Man-Month (1975)`),

  q(`Harold Abelson`, `Programs must be written for people to read, and only incidentally for machines to execute.`, `Structure and Interpretation of Computer Programs, Preface, with Gerald Jay Sussman (1985)`),

  q(`Larry Wall`, `The three chief virtues of a programmer are: Laziness, Impatience and Hubris.`, `Programming Perl (1991)`),

  q(`Steve Jobs`, `You can't connect the dots looking forward; you can only connect them looking backwards.`, `Commencement address at Stanford University (June 12, 2005)`),

  q(`Stewart Brand`, `Stay hungry. Stay foolish.`, `Farewell message on the back cover of the final Whole Earth Catalog (1974)`),

  q(`Tim Berners-Lee`, `This is for everyone.`, `Message at the Opening Ceremony of the London Olympic Games (July 27, 2012)`),

  // ─── Design and architecture ────────────────────────────────────────

  q(`Charles Eames`, `The details are not the details. They make the design.`, `Attributed`),

  q(`Louis Kahn`, `Even a brick wants to be something.`, `Master class at the University of Pennsylvania (1971)`),

  q(`Ludwig Mies van der Rohe`, `Less is more.`, `As quoted in the New York Herald Tribune (June 28, 1959)`),

  q(`Milton Glaser`, `Less is not necessarily more.`, `Art Is Work (2000)`),

  // ─── Photography and dance ──────────────────────────────────────────

  q(`Dorothea Lange`, `The camera is an instrument that teaches people how to see without a camera.`, `As quoted in the Los Angeles Times (August 13, 1978)`),

  q(`Ansel Adams`, `You don't take a photograph, you make it.`, `Attributed`),

  q(`Henri Cartier-Bresson`, `Your first 10,000 photographs are your worst.`, `Attributed`),

  q(`Diane Arbus`, `A photograph is a secret about a secret. The more it tells you the less you know.`, `As quoted in Patricia Bosworth, Diane Arbus: A Biography (1984)`),

  q(`Martha Graham`, `There is a vitality, a life force, an energy, a quickening that is translated through you into action, and because there is only one of you in all of time, this expression is unique.`, `As quoted in Agnes de Mille, Martha (1991)`),

  q(`Twyla Tharp`, `Creativity is a habit, and the best creativity is the result of good work habits.`, `The Creative Habit (2003)`),

  q(`Pina Bausch`, `I'm not interested in how people move, but what moves them.`, `As quoted in interviews`),

  // ─── Sport ──────────────────────────────────────────────────────────

  q(`Muhammad Ali`, `The man who views the world at fifty the same as he did at twenty has wasted thirty years of his life.`, `Interview in Playboy (November 1975)`),
  q(`Muhammad Ali`, `Float like a butterfly, sting like a bee.`, `Before fighting Sonny Liston (February 1964), with Drew Bundini Brown`),

  q(`Bruce Lee`, `Empty your mind, be formless, shapeless - like water.`, `Longstreet, "The Way of the Intercepting Fist" (1971)`),

  q(`Michael Jordan`, `I've failed over and over and over again in my life. And that is why I succeed.`, `Nike television advertisement (1997)`),

  q(`Wayne Gretzky`, `You miss 100% of the shots you don't take.`, `As quoted in The Hockey News (January 1983)`),

  q(`Yogi Berra`, `You can observe a lot by watching.`, `The Yogi Book (1998)`),
  q(`Yogi Berra`, `When you come to a fork in the road, take it.`, `The Yogi Book (1998)`),
  q(`Yogi Berra`, `It ain't over till it's over.`, `Remark to reporters (July 1973)`),

  q(`Billie Jean King`, `Pressure is a privilege.`, `Pressure Is a Privilege (2008)`),

  q(`John Wooden`, `Be quick, but don't hurry.`, `Wooden: A Lifetime of Observations and Reflections On and Off the Court (1997)`),

  q(`Jackie Robinson`, `A life is not important except in the impact it has on other lives.`, `Inscribed on his gravestone (1972)`),

  q(`Roberto Clemente`, `Any time you have an opportunity to make a difference in this world and you don't, then you are wasting your time on Earth.`, `As quoted in interviews (1971)`),

  q(`Eliud Kipchoge`, `No human is limited.`, `After running a marathon in under two hours (October 12, 2019)`),

  q(`Arthur Ashe`, `Start where you are. Use what you have. Do what you can.`, `Attributed`),

  // ─── Food and travel ────────────────────────────────────────────────

  q(`Anthony Bourdain`, `Your body is not a temple, it's an amusement park. Enjoy the ride.`, `Kitchen Confidential (2000)`),
  q(`Anthony Bourdain`, `Travel isn't always pretty. It isn't always comfortable. But that's okay. The journey changes you; it should change you.`, `No Reservations (2005)`),

  q(`Julia Child`, `The only real stumbling block is fear of failure. In cooking you've got to have a what-the-hell attitude.`, `Attributed`),

  // ─── Contemplatives ─────────────────────────────────────────────────

  q(`Ajahn Chah`, `If you let go a little, you will have a little peace. If you let go a lot, you will have a lot of peace. If you let go completely, you will know complete peace.`, `A Still Forest Pool (1985)`),

  q(`Jon Kabat-Zinn`, `You can't stop the waves, but you can learn to surf.`, `Wherever You Go, There You Are (1994)`),

  q(`Pema Chödrön`, `You are the sky. Everything else - it's just the weather.`, `Attributed; as quoted in talks`),

  q(`Ram Dass`, `We're all just walking each other home.`, `Walking Each Other Home, with Mirabai Bush (2018)`),

  q(`Eckhart Tolle`, `Realize deeply that the present moment is all you have.`, `The Power of Now (1997)`),

  q(`Jiddu Krishnamurti`, `The ability to observe without evaluating is the highest form of intelligence.`, `Attributed`),

  q(`Anthony de Mello`, `Wisdom tends to grow in proportion to one's awareness of one's ignorance.`, `Awareness (1990)`),

  q(`John O'Donohue`, `May you experience each day as a sacred gift woven around the heart of wonder.`, `To Bless the Space Between Us (2008)`),

  // ─── Leaders and activists ──────────────────────────────────────────

  q(`Malala Yousafzai`, `One child, one teacher, one book, one pen can change the world.`, `Speech at the United Nations (July 12, 2013)`),

  q(`Ruth Bader Ginsburg`, `Fight for the things that you care about, but do it in a way that will lead others to join you.`, `Radcliffe Day, Harvard (May 29, 2015)`),

  q(`John Lewis`, `Never, ever be afraid to make some noise and get in good trouble, necessary trouble.`, `On Twitter (June 27, 2018)`),

  q(`Cesar Chavez`, `Once social change begins, it cannot be reversed.`, `Address to the Commonwealth Club of California (November 9, 1984)`),

  q(`Harvey Milk`, `You gotta give 'em hope.`, `"The Hope Speech" (1978)`),

];
