// Fourth-round candidates: aphorists, explorers, doctors, historians,
// inventors, magicians, theatre, music, painters, writers on writing, and
// voices from Latin America, Japan, China and Eastern Europe. The first one
// here is ID 761, and so on in order: keep the order stable once IDs have
// been exported.

export const FIRST_ID = 761;

const q = (author, text, source) => ({ author, text, source });

export const CANDIDATES = [
  // ─── Aphorists and wits ─────────────────────────────────────────────

  q(`François de La Rochefoucauld`, `We all have strength enough to endure the misfortunes of others.`, `Maxims, 19 (1665)`),
  q(`François de La Rochefoucauld`, `Nothing prevents our being natural so much as the desire to appear so.`, `Maxims, 431 (1665)`),

  q(`Georg Christoph Lichtenberg`, `A book is a mirror: if an ape looks into it an apostle is hardly likely to look out.`, `The Waste Books, R. J. Hollingdale translation (1990)`),
  q(`Georg Christoph Lichtenberg`, `I cannot say whether things will get better if we change; what I can say is they must change if they are to get better.`, `The Waste Books, R. J. Hollingdale translation (1990)`),

  q(`Nicolas Chamfort`, `The most wasted of all days is one without laughter.`, `Maxims and Considerations (1795)`),

  q(`Joseph Joubert`, `To teach is to learn twice.`, `Pensées (1838)`),

  q(`Karl Kraus`, `The closer the look one takes at a word, the greater the distance from which it looks back.`, `Pro domo et mundo (1912)`),

  q(`Samuel Johnson`, `Depend upon it, Sir, when a man knows he is to be hanged in a fortnight, it concentrates his mind wonderfully.`, `As recorded in James Boswell, Life of Samuel Johnson (1791)`),
  q(`Samuel Johnson`, `When a man is tired of London, he is tired of life.`, `As recorded in James Boswell, Life of Samuel Johnson (1791)`),
  q(`Samuel Johnson`, `Language is the dress of thought.`, `Lives of the Poets, "Cowley" (1779)`),

  q(`Ogden Nash`, `Candy
Is dandy
But liquor
Is quicker.`, `"Reflections on Ice-Breaking" (1931)`),

  // ─── Twentieth-century thinkers ─────────────────────────────────────

  q(`Alfred North Whitehead`, `Civilization advances by extending the number of important operations which we can perform without thinking about them.`, `An Introduction to Mathematics (1911)`),

  q(`Karl Popper`, `Our knowledge can only be finite, while our ignorance must necessarily be infinite.`, `Conjectures and Refutations (1963)`),

  q(`José Ortega y Gasset`, `I am I and my circumstance.`, `Meditations on Quixote (1914)`),

  q(`C. S. Lewis`, `Friendship is born at that moment when one man says to another: "What! You too? I thought that no one but myself..."`, `The Four Loves (1960)`),
  q(`C. S. Lewis`, `You can't get a cup of tea big enough or a book long enough to suit me.`, `As quoted in Walter Hooper, C. S. Lewis: A Companion and Guide (1996)`),

  q(`Aleksandr Solzhenitsyn`, `The line dividing good and evil cuts through the heart of every human being.`, `The Gulag Archipelago, Thomas P. Whitney translation (1974)`),

  q(`Noam Chomsky`, `Colorless green ideas sleep furiously.`, `Syntactic Structures (1957)`),

  q(`B. F. Skinner`, `Education is what survives when what has been learned has been forgotten.`, `"Education in 1984," New Scientist (May 21, 1964)`),

  q(`Lev Vygotsky`, `In play a child always behaves beyond his average age, above his daily behavior; in play it is as though he were a head taller than himself.`, `"Play and Its Role in the Mental Development of the Child," lecture (1933)`),

  q(`Seymour Papert`, `You can't think about thinking without thinking about thinking about something.`, `Mindstorms (1980)`),

  q(`Richard Hamming`, `The purpose of computing is insight, not numbers.`, `Numerical Methods for Scientists and Engineers (1962)`),

  // ─── Mathematics ────────────────────────────────────────────────────

  q(`George Pólya`, `If you can't solve a problem, then there is an easier problem you can solve: find it.`, `How to Solve It (1945)`),

  q(`Georg Cantor`, `The essence of mathematics lies in its freedom.`, `Grundlagen einer allgemeinen Mannigfaltigkeitslehre (1883)`),

  q(`David Hilbert`, `We must know. We will know.`, `Address in Königsberg (September 8, 1930)`),

  q(`Sofia Kovalevskaya`, `It is impossible to be a mathematician without being a poet in soul.`, `Memoir of a Childhood (1890)`),

  q(`Archimedes`, `Give me a place to stand, and I shall move the earth.`, `As recorded by Pappus of Alexandria, Collection, Book VIII (c. 340)`),

  // ─── Explorers, mountaineers and sailors ────────────────────────────

  q(`George Mallory`, `Because it's there.`, `On why he wanted to climb Everest, The New York Times (March 18, 1923)`),

  q(`Nan Shepherd`, `Often the mountain gives itself most completely when I have no destination.`, `The Living Mountain (1977)`),

  q(`Ernest Shackleton`, `Optimism is true moral courage.`, `South (1919)`),

  q(`Freya Stark`, `To awaken quite alone in a strange town is one of the pleasantest sensations in the world.`, `Baghdad Sketches (1932)`),

  q(`Amelia Earhart`, `Adventure is worthwhile in itself.`, `Last Flight (1937)`),

  q(`Neil Armstrong`, `That's one small step for a man, one giant leap for mankind.`, `On the surface of the Moon (July 20, 1969)`),

  q(`Bernard Moitessier`, `I am continuing non-stop towards the Pacific Islands because I am happy at sea and perhaps to save my soul.`, `Message catapulted onto a passing ship during the Golden Globe Race (March 18, 1969)`),

  q(`Sylvia Earle`, `No water, no life. No blue, no green.`, `TED Prize talk (February 2009)`),

  q(`Paul Theroux`, `Tourists don't know where they've been, travelers don't know where they're going.`, `The Old Patagonian Express (1979)`),

  // ─── Medicine ───────────────────────────────────────────────────────

  q(`Hippocrates`, `Life is short, the art long, opportunity fleeting, experience treacherous, judgment difficult.`, `Aphorisms, I.1 (c. 400 BC)`),

  q(`Paracelsus`, `All things are poison, and nothing is without poison; the dosage alone makes it so a thing is not a poison.`, `Third Defence (1538)`),

  q(`William Osler`, `The good physician treats the disease; the great physician treats the patient who has the disease.`, `Attributed`),

  q(`Paul Kalanithi`, `Even if I'm dying, until I actually die, I am still living.`, `When Breath Becomes Air (2016)`),

  // ─── History ────────────────────────────────────────────────────────

  q(`Herodotus`, `In peace, sons bury their fathers. In war, fathers bury their sons.`, `Histories, Book I (c. 430 BC)`),

  q(`Tacitus`, `They make a desert and call it peace.`, `Agricola, 30 (c. 98)`),

  q(`Will Durant`, `Civilization exists by geological consent, subject to change without notice.`, `"What Is Civilization?," Ladies' Home Journal (January 1946)`),

  q(`Barbara Tuchman`, `Books are the carriers of civilization.`, `Address at the Library of Congress (1979)`),

  q(`Howard Zinn`, `You can't be neutral on a moving train.`, `You Can't Be Neutral on a Moving Train (1994)`),

  // ─── Inventors and engineers ────────────────────────────────────────

  q(`Thomas Edison`, `Genius is one per cent inspiration, ninety-nine per cent perspiration.`, `As quoted in Harper's Monthly (September 1932)`),

  q(`Wilbur Wright`, `It is possible to fly without motors, but not without knowledge and skill.`, `Letter to Octave Chanute (May 13, 1900)`),

  q(`Charlie Munger`, `Invert, always invert.`, `After the mathematician Carl Jacobi, in talks and shareholder meetings`),

  q(`E. F. Schumacher`, `Small is beautiful.`, `Small Is Beautiful (1973)`),

  q(`Jane Jacobs`, `Cities have the capability of providing something for everybody, only because, and only when, they are created by everybody.`, `The Death and Life of Great American Cities (1961)`),

  q(`Le Corbusier`, `A house is a machine for living in.`, `Toward an Architecture (1923)`),

  // ─── Magic and theatre ──────────────────────────────────────────────

  q(`Teller`, `Sometimes magic is just someone spending more time on something than anyone else might reasonably expect.`, `"Teller Reveals His Secrets," Smithsonian (March 2012)`),

  q(`Harry Houdini`, `My brain is the key that sets my mind free.`, `Attributed`),

  q(`Samuel Beckett`, `Ever tried. Ever failed. No matter. Try again. Fail again. Fail better.`, `Worstward Ho (1983)`),

  q(`Tom Stoppard`, `Every exit is an entry somewhere else.`, `Rosencrantz and Guildenstern Are Dead (1966)`),

  q(`Peter Brook`, `I can take any empty space and call it a bare stage.`, `The Empty Space (1968)`),

  q(`Konstantin Stanislavski`, `Love the art in yourself, not yourself in the art.`, `My Life in Art (1924)`),

  q(`Stephen Sondheim`, `Content dictates form.`, `Finishing the Hat (2010)`),

  // ─── Music ──────────────────────────────────────────────────────────

  q(`Igor Stravinsky`, `The more constraints one imposes, the more one frees oneself of the chains that shackle the spirit.`, `Poetics of Music (1942)`),

  q(`Charles Mingus`, `Making the simple complicated is commonplace; making the complicated simple, awesomely simple, that's creativity.`, `As quoted in Mainliner magazine (July 1977)`),

  q(`Erik Satie`, `Experience is one of the forms of paralysis.`, `Memoirs of an Amnesiac (1912)`),

  q(`Leonard Bernstein`, `To achieve great things, two things are needed: a plan, and not quite enough time.`, `Attributed`),

  q(`Duke Ellington`, `A problem is a chance for you to do your best.`, `Attributed`),

  q(`Ludwig van Beethoven`, `Don't only practice your art, but force your way into its secrets.`, `Letter to a young admirer, Emilie M. (July 17, 1812)`),

  // ─── Painting and sculpture ─────────────────────────────────────────

  q(`Katsushika Hokusai`, `From the age of six I had a mania for drawing the forms of things... at a hundred I shall perhaps truly have reached the level of the marvellous.`, `Postscript to One Hundred Views of Mount Fuji (1834)`),

  q(`Bob Ross`, `We don't make mistakes, just happy little accidents.`, `The Joy of Painting (1983-1994)`),

  q(`Chuck Close`, `Inspiration is for amateurs - the rest of us just show up and get to work.`, `As quoted in interviews`),

  q(`Constantin Brâncuși`, `Simplicity is complexity resolved.`, `Attributed`),

  q(`René Magritte`, `Everything we see hides another thing, we always want to see what is hidden by what we see.`, `Radio interview with Jean Neyens (1965)`),

  q(`Louise Bourgeois`, `Art is a guaranty of sanity.`, `Written on her 1999 print "Art is a guaranty of sanity"`),

  q(`Henri Matisse`, `There are always flowers for those who want to see them.`, `Attributed`),

  // ─── Writers on writing ─────────────────────────────────────────────

  q(`Anne Lamott`, `Bird by bird, buddy. Just take it bird by bird.`, `Bird by Bird (1994)`),

  q(`E. B. White`, `I arise in the morning torn between a desire to improve the world and a desire to enjoy the world. This makes it hard to plan the day.`, `Interview with Israel Shenker, The New York Times (July 11, 1969)`),

  q(`Elmore Leonard`, `I try to leave out the parts that readers tend to skip.`, `"Writers on Writing," The New York Times (July 16, 2001)`),

  q(`Franz Kafka`, `A book must be the axe for the frozen sea inside us.`, `Letter to Oskar Pollak (January 27, 1904)`),
  q(`Franz Kafka`, `From a certain point onward there is no longer any turning back. That is the point that must be reached.`, `The Zürau Aphorisms (1917-1918)`),

  q(`Fernando Pessoa`, `Literature is the most agreeable way of ignoring life.`, `The Book of Disquiet, Richard Zenith translation (2001)`),

  // ─── Latin America and Spain ────────────────────────────────────────

  q(`Antonio Machado`, `Traveller, there is no road; the road is made by walking.`, `"Proverbios y cantares," Campos de Castilla (1912)`),

  q(`Julio Cortázar`, `Nothing is lost if one has the courage to proclaim that all is lost and we must begin anew.`, `Hopscotch, Gregory Rabassa translation (1966)`),

  q(`Pablo Neruda`, `I want to do with you what spring does with the cherry trees.`, `Twenty Love Poems and a Song of Despair, Poem 14 (1924)`),

  q(`Clarice Lispector`, `I write as if to save somebody's life. Probably my own.`, `A Breath of Life, Johnny Lorenz translation (2012)`),

  // ─── Japan and China ────────────────────────────────────────────────

  q(`Jun'ichirō Tanizaki`, `We find beauty not in the thing itself but in the patterns of shadows, the light and the darkness, that one thing against another creates.`, `In Praise of Shadows, Thomas J. Harper and Edward G. Seidensticker translation (1977)`),

  q(`Natsume Sōseki`, `Approach everything rationally, and you become harsh. Pole along in the stream of emotions, and you will be swept away by the current. Give free rein to your desires, and you become uncomfortably confined. It is not a very agreeable place to live, this world of ours.`, `Kusamakura, Meredith McKinney translation (2008)`),

  q(`Lu Xun`, `Hope is like a path in the countryside. Originally, there was nothing - but as people walk this way again and again, a path appears.`, `"My Old Home" (1921)`),

  // ─── Contemplatives ─────────────────────────────────────────────────

  q(`Nisargadatta Maharaj`, `Wisdom tells me I am nothing. Love tells me I am everything. Between the two my life flows.`, `I Am That (1973)`),

  q(`Rebbe Nachman of Breslov`, `The whole world is a very narrow bridge, and the main thing is not to be afraid at all.`, `Likutei Moharan II:48 (c. 1810)`),

  q(`Meister Eckhart`, `The eye through which I see God is the same eye through which God sees me.`, `Sermon 12 (c. 1300)`),

  q(`Francis de Sales`, `Have patience with all things, but first of all with yourself.`, `Letters (c. 1600)`),

  q(`Robin Wall Kimmerer`, `All flourishing is mutual.`, `Braiding Sweetgrass (2013)`),

  q(`Joy Harjo`, `Remember the earth whose skin you are.`, `"Remember," She Had Some Horses (1983)`),

  // ─── Sport ──────────────────────────────────────────────────────────

  q(`Johan Cruyff`, `Playing football is very simple, but playing simple football is the hardest thing there is.`, `As quoted in interviews`),
  q(`Johan Cruyff`, `Every disadvantage has its advantage.`, `As quoted in interviews`),

  q(`Bill Shankly`, `Some people believe football is a matter of life and death. I am very disappointed with that attitude. I can assure you it is much, much more important than that.`, `Interview on Sportsnight (1981)`),

  q(`Dai Vernon`, `Be natural.`, `His advice to magicians, as quoted in The Vernon Chronicles (1987)`),

  // ─── Film ───────────────────────────────────────────────────────────

  q(`Alfred Hitchcock`, `Drama is life with the dull bits cut out.`, `As quoted in François Truffaut, Hitchcock (1967)`),

  q(`Billy Wilder`, `If you're going to tell people the truth, be funny or they'll kill you.`, `Attributed`),

  // ─── Economics and business ─────────────────────────────────────────

  q(`Warren Buffett`, `Someone's sitting in the shade today because someone planted a tree a long time ago.`, `As quoted in interviews`),

  q(`Yvon Chouinard`, `The hardest thing in the world is to simplify your life. It's so easy to make it complex.`, `Let My People Go Surfing (2005)`),

  // ─── Science ────────────────────────────────────────────────────────

  q(`David Attenborough`, `It seems to me that the natural world is the greatest source of excitement; the greatest source of visual beauty; the greatest source of intellectual interest.`, `As quoted in interviews`),

  q(`Loren Eiseley`, `If there is magic on this planet, it is contained in water.`, `The Immense Journey (1957)`),
];
