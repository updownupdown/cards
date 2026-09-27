// Candidate quotes for the vetting pass (see README.md in this folder).
// These are appended after the 208 quotes in QuotesText.ts, so the first one
// here is ID 209. Keep the order stable once IDs have been exported.

const q = (author, text, source) => ({ author, text, source });

export const candidates = [
  // ─── Existing authors ────────────────────────────────────────────────

  q(`Ralph Waldo Emerson`, `The years teach much which the days never know.`, `"Experience," Essays: Second Series (1844)`),
  q(`Ralph Waldo Emerson`, `Nothing can bring you peace but yourself.`, `"Self-Reliance," Essays: First Series (1841)`),
  q(`Ralph Waldo Emerson`, `The invariable mark of wisdom is to see the miraculous in the common.`, `Nature, Chapter VIII (1836)`),
  q(`Henry David Thoreau`, `I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach.`, `Walden, "Where I Lived, and What I Lived For" (1854)`),
  q(`Henry David Thoreau`, `Not till we are lost, in other words, not till we have lost the world, do we begin to find ourselves.`, `Walden, "The Village" (1854)`),

  q(`William Shakespeare`, `All the world's a stage,
And all the men and women merely players.`, `As You Like It, Act II, scene vii (c. 1599)`),
  q(`William Shakespeare`, `We are such stuff
As dreams are made on, and our little life
Is rounded with a sleep.`, `The Tempest, Act IV, scene i (c. 1611)`),
  q(`William Shakespeare`, `The fault, dear Brutus, is not in our stars,
But in ourselves.`, `Julius Caesar, Act I, scene ii (1599)`),
  q(`William Shakespeare`, `Our doubts are traitors,
And make us lose the good we oft might win
By fearing to attempt.`, `Measure for Measure, Act I, scene iv (c. 1603)`),
  q(`Jane Austen`, `Know your own happiness. You want nothing but patience; or give it a more fascinating name, call it hope.`, `Sense and Sensibility, Chapter 17 (1811)`),
  q(`Jane Austen`, `There is no charm equal to tenderness of heart.`, `Emma, Volume III, Chapter 2 (1815)`),

  q(`Mary Wollstonecraft`, `I do not wish them to have power over men; but over themselves.`, `A Vindication of the Rights of Woman, Chapter IV (1792)`),

  q(`Emily Dickinson`, `"Hope" is the thing with feathers -
That perches in the soul -`, `Poem 254 (c. 1861)`),
  q(`Emily Dickinson`, `The Brain - is wider than the Sky -`, `Poem 632 (c. 1862)`),
  q(`Emily Dickinson`, `I dwell in Possibility -
A fairer House than Prose -`, `Poem 657 (c. 1862)`),
  q(`Emily Dickinson`, `Tell all the truth but tell it slant -
Success in Circuit lies`, `Poem 1129 (c. 1868)`),

  q(`Walt Whitman`, `Do I contradict myself?
Very well then I contradict myself,
(I am large, I contain multitudes.)`, `"Song of Myself," Leaves of Grass (1855)`),
  q(`Walt Whitman`, `Re-examine all you have been told at school or church or in any book, dismiss whatever insults your own soul.`, `Preface, Leaves of Grass (1855)`),

  q(`Oscar Wilde`, `To live is the rarest thing in the world. Most people exist, that is all.`, `The Soul of Man under Socialism (1891)`),

  q(`Frederick Douglass`, `If there is no struggle there is no progress.`, `West India Emancipation speech (August 3, 1857)`),

  q(`W. E. B. Du Bois`, `Education must not simply teach work - it must teach Life.`, `"The Talented Tenth" (1903)`),

  q(`John Stuart Mill`, `It is better to be a human being dissatisfied than a pig satisfied; better to be Socrates dissatisfied than a fool satisfied.`, `Utilitarianism, Chapter II (1861)`),
  q(`John Stuart Mill`, `Ask yourself whether you are happy, and you cease to be so.`, `Autobiography, Chapter V (1873)`),

  q(`Bertrand Russell`, `The good life is one inspired by love and guided by knowledge.`, `What I Believe (1925)`),
  q(`Bertrand Russell`, `The fundamental cause of the trouble is that in the modern world the stupid are cocksure while the intelligent are full of doubt.`, `"The Triumph of Stupidity" (1933)`),

  q(`Helen Keller`, `Security is mostly a superstition. Life is either a daring adventure or nothing.`, `Let Us Have Faith (1940)`),
  q(`Helen Keller`, `The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart.`, `Letter to Rev. Phillips Brooks (June 8, 1891)`),


  q(`Kahlil Gibran`, `Your children are not your children. They are the sons and daughters of Life's longing for itself.`, `The Prophet, "On Children" (1923)`),
  q(`Kahlil Gibran`, `Work is love made visible.`, `The Prophet, "On Work" (1923)`),
  q(`Epictetus`, `It is impossible for a man to learn what he thinks he already knows.`, `Discourses, Book II, Chapter 17`),

  q(`Marcus Aurelius`, `Everything is only for a day, both that which remembers and that which is remembered.`, `Meditations, Book IV, George Long translation (1862)`),

  q(`Seneca`, `Wherever there is a human being, there is an opportunity for a kindness.`, `On the Happy Life, Chapter 24`),

  q(`Dhammapada`, `All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts.`, `Verse 1, Yamaka Vagga, F. Max Müller translation (1881)`),
  q(`Dhammapada`, `As a solid rock is not shaken by the wind, so wise people falter not amidst blame and praise.`, `Verse 81, Pandita Vagga, F. Max Müller translation (1881)`),
  q(`Thich Nhat Hanh`, `The present moment is filled with joy and happiness. If you are attentive, you will see it.`, `Peace Is Every Step (1991)`),
  q(`Shunryu Suzuki`, `When you do something, you should burn yourself completely, like a good bonfire, leaving no trace of yourself.`, `Zen Mind, Beginner's Mind (1970)`),
  q(`Shunryu Suzuki`, `Each of you is perfect the way you are... and you can use a little improvement.`, `As quoted in David Chadwick, Crooked Cucumber (1999)`),

  q(`Zhuangzi`, `Everyone knows the usefulness of the useful, but no one knows the usefulness of the useless.`, `Zhuangzi, Chapter 4, Burton Watson translation (1968)`),
  q(`Zhuangzi`, `The Perfect Man uses his mind like a mirror - going after nothing, welcoming nothing, responding but not storing.`, `Zhuangzi, Chapter 7, Burton Watson translation (1968)`),
  q(`Zhuangzi`, `You're not a fish - how do you know what fish enjoy?`, `Zhuangzi, Chapter 17, Burton Watson translation (1968)`),

  q(`Michel de Montaigne`, `When I play with my cat, who knows if I am not a pastime to her more than she is to me?`, `Essays, "Apology for Raymond Sebond," Donald Frame translation (1958)`),
  q(`Michel de Montaigne`, `Children's games are not games, and must be judged in children as their most serious actions.`, `Essays, "Of Custom" (1580)`),
  q(`Carl Sagan`, `Look again at that dot. That's here. That's home. That's us.`, `Pale Blue Dot (1994)`),
  q(`Carl Sagan`, `For small creatures such as we the vastness is bearable only through love.`, `Contact (1985)`),
  q(`Carl Sagan`, `If you wish to make an apple pie from scratch, you must first invent the universe.`, `Cosmos (1980)`),

  q(`Epicurus`, `Death is nothing to us; for that which is dissolved is without sensation, and that which lacks sensation is nothing to us.`, `Principal Doctrines, 2, R. D. Hicks translation (1925)`),
  q(`Epicurus`, `It is impossible to live a pleasant life without living wisely and well and justly.`, `Principal Doctrines, 5, R. D. Hicks translation (1925)`),

  q(`Marie Curie`, `One never notices what has been done; one can only see what remains to be done.`, `Letter to her brother Józef (March 18, 1894)`),
  q(`Marie Curie`, `I was taught that the way of progress is neither swift nor easy.`, `Pierre Curie, "Autobiographical Notes" (1923)`),

  q(`Niels Bohr`, `The opposite of a correct statement is a false statement. But the opposite of a profound truth may well be another profound truth.`, `As recalled by his son Hans Bohr, in Niels Bohr: His Life and Work (1967)`),
  q(`Niels Bohr`, `How wonderful that we have met with a paradox. Now we have some hope of making progress.`, `As quoted in Ruth Moore, Niels Bohr: The Man, His Science, and the World They Changed (1966)`),

  // ─── Play and games ─────────────────────────────────────────────────

  q(`Heraclitus`, `Time is a child playing draughts; the kingly power is a child's.`, `Fragment 79, John Burnet translation (1892)`),
  q(`Heraclitus`, `You cannot step twice into the same rivers; for fresh waters are ever flowing in upon you.`, `Fragment 41, John Burnet translation (1892)`),
  q(`Heraclitus`, `Nature loves to hide.`, `Fragment 10, John Burnet translation (1892)`),
  q(`Friedrich Schiller`, `Man only plays when in the full meaning of the word he is a man, and he is only completely a man when he plays.`, `On the Aesthetic Education of Man, Letter XV (1795)`),

  q(`Johan Huizinga`, `Play is older than culture.`, `Homo Ludens (1938)`),
  q(`Johan Huizinga`, `Into an imperfect world and into the confusion of life it brings a temporary, a limited perfection.`, `Homo Ludens, Chapter I (1938)`),
  q(`James P. Carse`, `There are at least two kinds of games. One could be called finite, the other infinite. A finite game is played for the purpose of winning, an infinite game for the purpose of continuing the play.`, `Finite and Infinite Games (1986)`),
  q(`James P. Carse`, `To be prepared against surprise is to be trained. To be prepared for surprise is to be educated.`, `Finite and Infinite Games (1986)`),
  q(`James P. Carse`, `Whoever must play, cannot play.`, `Finite and Infinite Games (1986)`),

  q(`Bernard Suits`, `Playing a game is the voluntary attempt to overcome unnecessary obstacles.`, `The Grasshopper: Games, Life and Utopia (1978)`),

  q(`D. W. Winnicott`, `It is in playing and only in playing that the individual child or adult is able to be creative and to use the whole personality.`, `Playing and Reality (1971)`),

  q(`Brian Sutton-Smith`, `The opposite of play is not work. It is depression.`, `The Ambiguity of Play (1997)`),

  q(`Mihaly Csikszentmihalyi`, `The best moments usually occur when a person's body or mind is stretched to its limits in a voluntary effort to accomplish something difficult and worthwhile.`, `Flow: The Psychology of Optimal Experience (1990)`),
  q(`Plato`, `Life must be lived as play, playing certain games, making sacrifices, singing and dancing.`, `Laws, Book VII (c. 348 BC)`),
  q(`Plato`, `Wonder is the feeling of a philosopher, and philosophy begins in wonder.`, `Theaetetus, Benjamin Jowett translation (1871)`),

  q(`Benjamin Franklin`, `Life is a kind of Chess, in which we have often points to gain, and competitors or adversaries to contend with.`, `"The Morals of Chess" (1779)`),
  q(`Benjamin Franklin`, `We learn by Chess the habit of not being discouraged by present bad appearances in the state of our affairs.`, `"The Morals of Chess" (1779)`),
  q(`Benjamin Franklin`, `Well done is better than well said.`, `Poor Richard's Almanack (1737)`),
  q(`Arthur Schopenhauer`, `It is Fate which shuffles the cards, and we who play.`, `Counsels and Maxims, T. Bailey Saunders translation (1890)`),
  q(`Arthur Schopenhauer`, `Talent hits a target no one else can hit; genius hits a target no one else can see.`, `The World as Will and Representation, Volume II (1844)`),
  q(`Arthur Schopenhauer`, `Every man takes the limits of his own field of vision for the limits of the world.`, `Studies in Pessimism, T. Bailey Saunders translation (1893)`),

  q(`Miguel de Cervantes`, `Patience, and shuffle the cards.`, `Don Quixote, Part II, Chapter 23, John Ormsby translation (1885)`),
  q(`Miguel de Cervantes`, `Until death it is all life.`, `Don Quixote, Part II, Chapter 59, John Ormsby translation (1885)`),

  q(`Emanuel Lasker`, `On the chessboard lies and hypocrisy do not survive long.`, `Lasker's Manual of Chess, Preface (1925)`),

  q(`Lewis Carroll`, `Why, sometimes I've believed as many as six impossible things before breakfast.`, `Through the Looking-Glass, Chapter V (1871)`),
  q(`Lewis Carroll`, `Now, here, you see, it takes all the running you can do, to keep in the same place.`, `Through the Looking-Glass, Chapter II (1871)`),
  q(`Lewis Carroll`, `It's a great huge game of chess that's being played - all over the world.`, `Through the Looking-Glass, Chapter II (1871)`),

  q(`Mark Twain`, `Work consists of whatever a body is obliged to do, and Play consists of whatever a body is not obliged to do.`, `The Adventures of Tom Sawyer, Chapter II (1876)`),
  q(`Mark Twain`, `Courage is resistance to fear, mastery of fear - not absence of fear.`, `Pudd'nhead Wilson, Chapter XII (1894)`),
  q(`Omar Khayyam`, `'Tis all a Chequer-board of Nights and Days
Where Destiny with Men for Pieces plays.`, `Rubáiyát, quatrain XLIX, Edward FitzGerald translation (1859)`),
  q(`Omar Khayyam`, `The Moving Finger writes; and, having writ,
Moves on: nor all thy Piety nor Wit
Shall lure it back to cancel half a Line.`, `Rubáiyát, quatrain LI, Edward FitzGerald translation (1859)`),

  q(`Confucius`, `Hard is the case of him, who will stuff himself with food the whole day, without applying his mind to anything good! Are there not gamesters and chess players? To be one of these would still be better than doing nothing at all.`, `Analects, Book XVII, James Legge translation (1861)`),
  q(`Confucius`, `When you know a thing, to hold that you know it; and when you do not know a thing, to allow that you do not know it; this is knowledge.`, `Analects, Book II, James Legge translation (1861)`),
  q(`Confucius`, `Learning without thought is labour lost; thought without learning is perilous.`, `Analects, Book II, James Legge translation (1861)`),
  q(`Confucius`, `When I walk along with two others, they may serve me as my teachers. I will select their good qualities and follow them, their bad qualities and avoid them.`, `Analects, Book VII, James Legge translation (1861)`),
  q(`Confucius`, `What you do not want done to yourself, do not do to others.`, `Analects, Book XV, James Legge translation (1861)`),
  q(`Yoshida Kenkō`, `Don't play to win. Play so that you won't lose.`, `Essays in Idleness, Section 110, Donald Keene translation (1967)`),
  q(`Yoshida Kenkō`, `The most precious thing in life is its uncertainty.`, `Essays in Idleness, Section 7, Donald Keene translation (1967)`),
  q(`Yoshida Kenkō`, `To sit alone in the lamplight with a book spread out before you, and hold intimate converse with men of unseen generations - such is a pleasure beyond compare.`, `Essays in Idleness, Section 13, Donald Keene translation (1967)`),

  q(`Albert Einstein`, `Quantum mechanics is certainly imposing. But an inner voice tells me that it is not yet the real thing. The theory says a lot, but does not really bring us any closer to the secret of the Old One. I, at any rate, am convinced that He does not throw dice.`, `Letter to Max Born (December 4, 1926)`),
  q(`Albert Einstein`, `The most beautiful thing we can experience is the mysterious. It is the source of all true art and all science.`, `"What I Believe," The World As I See It (1930)`),
  q(`Albert Einstein`, `Imagination is more important than knowledge. For knowledge is limited, whereas imagination embraces the entire world.`, `Interview with George Sylvester Viereck, The Saturday Evening Post (October 26, 1929)`),
  q(`Albert Einstein`, `Life is like riding a bicycle. To keep your balance you must keep moving.`, `Letter to his son Eduard (February 5, 1930)`),
  q(`Albert Einstein`, `The important thing is not to stop questioning. Curiosity has its own reason for existing.`, `"Old Man's Advice to Youth," LIFE magazine (May 2, 1955)`),
  q(`Isaac Newton`, `I seem to have been only like a boy playing on the sea-shore, and diverting myself in now and then finding a smoother pebble or a prettier shell than ordinary, whilst the great ocean of truth lay all undiscovered before me.`, `As recorded in David Brewster, Memoirs of Sir Isaac Newton (1855)`),
  q(`Isaac Newton`, `If I have seen further it is by standing on the shoulders of Giants.`, `Letter to Robert Hooke (February 5, 1676)`),

  q(`Carl Jung`, `The creation of something new is not accomplished by the intellect but by the play instinct acting from inner necessity. The creative mind plays with the objects it loves.`, `Psychological Types (1921)`),
  q(`Carl Jung`, `Your vision will become clear only when you can look into your own heart. Who looks outside, dreams; who looks inside, awakes.`, `Letter to Fanny Bowditch (October 22, 1916)`),
  q(`Friedrich Nietzsche`, `The maturity of man - that means, to have reacquired the seriousness that one had as a child at play.`, `Beyond Good and Evil, §94, Helen Zimmern translation (1906)`),
  q(`Friedrich Nietzsche`, `One must still have chaos in oneself to be able to give birth to a dancing star.`, `Thus Spoke Zarathustra, Prologue, Thomas Common translation (1909)`),
  q(`Friedrich Nietzsche`, `If we have our own why of life, we shall get along with almost any how.`, `Twilight of the Idols, "Maxims and Arrows," 12 (1889)`),
  q(`Friedrich Nietzsche`, `Without music, life would be an error.`, `Twilight of the Idols, "Maxims and Arrows," 33 (1889)`),

  q(`Ludwig Wittgenstein`, `The limits of my language mean the limits of my world.`, `Tractatus Logico-Philosophicus, 5.6, C. K. Ogden translation (1922)`),
  q(`Ludwig Wittgenstein`, `Whereof one cannot speak, thereof one must be silent.`, `Tractatus Logico-Philosophicus, 7, C. K. Ogden translation (1922)`),
  q(`Ludwig Wittgenstein`, `The term "language-game" is meant to bring into prominence the fact that the speaking of language is part of an activity, or of a form of life.`, `Philosophical Investigations, §23, G. E. M. Anscombe translation (1953)`),
  q(`Aristotle`, `For as it is not one swallow or one fine day that makes a spring, so it is not one day or a short time that makes a man blessed and happy.`, `Nicomachean Ethics, Book I, W. D. Ross translation (1908)`),
  q(`Aristotle`, `For the things we have to learn before we can do them, we learn by doing them.`, `Nicomachean Ethics, Book II, W. D. Ross translation (1908)`),
  q(`Aristotle`, `To amuse oneself in order that one may exert oneself, as Anacharsis puts it, seems right; for amusement is a sort of relaxation.`, `Nicomachean Ethics, Book X, W. D. Ross translation (1908)`),

  q(`Theodore Roosevelt`, `It is not the critic who counts; not the man who points out how the strong man stumbles. The credit belongs to the man who is actually in the arena.`, `"Citizenship in a Republic," speech at the Sorbonne (April 23, 1910)`),
  q(`Theodore Roosevelt`, `Far better is it to dare mighty things, to win glorious triumphs, even though checkered by failure, than to rank with those poor spirits who neither enjoy much nor suffer much.`, `"The Strenuous Life," speech in Chicago (April 10, 1899)`),

  q(`Miyamoto Musashi`, `From one thing, know ten thousand things.`, `The Book of Five Rings, Victor Harris translation (1974)`),
  q(`Miyamoto Musashi`, `Do nothing which is of no use.`, `The Book of Five Rings, Victor Harris translation (1974)`),
  q(`Miyamoto Musashi`, `Perceive those things which cannot be seen.`, `The Book of Five Rings, Victor Harris translation (1974)`),

  q(`Sun Tzu`, `If you know the enemy and know yourself, you need not fear the result of a hundred battles.`, `The Art of War, Chapter III, Lionel Giles translation (1910)`),
  q(`Sun Tzu`, `Supreme excellence consists in breaking the enemy's resistance without fighting.`, `The Art of War, Chapter III, Lionel Giles translation (1910)`),
  q(`Sun Tzu`, `The clever combatant imposes his will on the enemy, but does not allow the enemy's will to be imposed on him.`, `The Art of War, Chapter VI, Lionel Giles translation (1910)`),
  q(`Sun Tzu`, `Water shapes its course according to the nature of the ground over which it flows.`, `The Art of War, Chapter VI, Lionel Giles translation (1910)`),
  q(`Jorge Luis Borges`, `God moves the player, he, in turn, the piece.
But what god beyond God begins the round
Of dust and time and sleep and agonies?`, `"Chess," El Hacedor (1960)`),
  q(`Jorge Luis Borges`, `I have always imagined that Paradise will be a kind of library.`, `"Poem of the Gifts," El Hacedor (1960)`),
  q(`Jorge Luis Borges`, `Time is the substance I am made of. Time is a river which sweeps me along, but I am the river.`, `"A New Refutation of Time," Other Inquisitions (1952)`),

  // ─── Ancient Greece and Rome ────────────────────────────────────────

  q(`Socrates`, `The unexamined life is not worth living.`, `Plato, Apology, Benjamin Jowett translation (1871)`),
  q(`Socrates`, `I neither know nor think that I know.`, `Plato, Apology, Benjamin Jowett translation (1871)`),
  q(`Diogenes of Sinope`, `Stand out of my light.`, `To Alexander the Great, in Diogenes Laërtius, Lives of Eminent Philosophers, Book VI, R. D. Hicks translation (1925)`),
  q(`Cicero`, `If you have a garden and a library, you have everything you need.`, `Letters to Friends, IX.4 (46 BC)`),
  q(`Cicero`, `To be ignorant of what occurred before you were born is to remain always a child.`, `Orator, 120 (46 BC)`),
  q(`Plutarch`, `For the mind does not require filling like a bottle, but rather, like wood, it only requires kindling to create in it an impulse to think independently and an ardent desire for the truth.`, `Moralia, "On Listening to Lectures," Frank Cole Babbitt translation (1927)`),

  q(`Boethius`, `Nothing is miserable unless you think it so; and on the other hand, nothing brings happiness unless you are content with it.`, `The Consolation of Philosophy, Book II, H. R. James translation (1897)`),

  q(`Augustine of Hippo`, `Men go abroad to wonder at the heights of mountains, at the huge waves of the sea, at the long courses of the rivers, at the vast compass of the ocean, at the circular motion of the stars, and they pass by themselves without wondering.`, `Confessions, Book X (c. 400)`),
  q(`Hillel the Elder`, `If I am not for myself, who will be for me? And being for myself, what am I? And if not now, when?`, `Pirkei Avot 1:14`),

  // ─── China ──────────────────────────────────────────────────────────

  q(`Mencius`, `The great man is he who does not lose his child's-heart.`, `Mencius, Book IV, Part II, James Legge translation (1861)`),
  q(`Xunzi`, `Learning should never cease. Blue comes from the indigo plant but is bluer than the plant itself.`, `Xunzi, "Encouraging Learning," Burton Watson translation (1963)`),
  q(`Tao Yuanming`, `I pluck chrysanthemums under the eastern hedge,
Then gaze afar towards the southern hills.`, `"Drinking Wine," Poem V (c. 405)`),

  q(`Li Bai`, `We sit together, the mountain and me,
until only the mountain remains.`, `"Zazen on Ching-t'ing Mountain," Sam Hamill translation (1987)`),
  q(`Du Fu`, `The state is shattered; mountains and rivers remain.`, `"Spring View" (757)`),

  q(`Sengcan`, `The Great Way is not difficult for those who have no preferences.`, `Hsin Hsin Ming (c. 600)`),

  // ─── Japan ──────────────────────────────────────────────────────────

  q(`Matsuo Bashō`, `Do not seek to follow in the footsteps of the men of old; seek what they sought.`, `"Words on Parting with Kyoriku" (1693)`),
  q(`Matsuo Bashō`, `Days and months are travellers of eternity. So are the years that pass by.`, `The Narrow Road to the Deep North, Nobuyuki Yuasa translation (1966)`),
  q(`Matsuo Bashō`, `The old pond -
a frog jumps in,
sound of water.`, `Haiku (1686), Robert Hass translation (1994)`),

  q(`Kobayashi Issa`, `The world of dew
is the world of dew.
And yet, and yet . . .`, `Haiku (1819), Robert Hass translation (1994)`),
  q(`Kobayashi Issa`, `Don't worry, spiders,
I keep house
casually.`, `Haiku, Robert Hass translation (1994)`),

  q(`Ryōkan`, `The thief
left it behind:
the moon at my window.`, `Haiku, John Stevens translation (1977)`),

  q(`Dōgen`, `To study the buddha way is to study the self. To study the self is to forget the self. To forget the self is to be actualized by myriad things.`, `Genjōkōan (1233), Kazuaki Tanahashi translation (1985)`),
  q(`Dōgen`, `Enlightenment is like the moon reflected on the water. The moon does not get wet, nor is the water broken.`, `Genjōkōan (1233), Kazuaki Tanahashi translation (1985)`),

  q(`Kamo no Chōmei`, `The flowing river never stops and yet the water never stays the same.`, `Hōjōki (1212), Donald Keene translation (1955)`),

  q(`Okakura Kakuzō`, `Those who cannot feel the littleness of great things in themselves are apt to overlook the greatness of little things in others.`, `The Book of Tea (1906)`),
  q(`Okakura Kakuzō`, `The art of life lies in a constant readjustment to our surroundings.`, `The Book of Tea (1906)`),
  // ─── India and Tibet ────────────────────────────────────────────────

  q(`Rabindranath Tagore`, `The butterfly counts not months but moments, and has time enough.`, `Fireflies (1928)`),
  q(`Rabindranath Tagore`, `If you shut your door to all errors truth will be shut out.`, `Stray Birds, 130 (1916)`),
  q(`Rabindranath Tagore`, `Faith is the bird that feels the light and sings when the dawn is still dark.`, `Fireflies (1928)`),
  q(`Rabindranath Tagore`, `You cannot cross the sea merely by standing and staring at the water.`, `Stray Birds, 196 (1916)`),
  q(`Kabir`, `I laugh when I hear that the fish in the water is thirsty.`, `Songs of Kabir, Rabindranath Tagore translation (1915)`),

  q(`Thiruvalluvar`, `Learn thoroughly what should be learnt; then let your conduct be worthy of your learning.`, `Tirukkural, 391 (c. 5th century)`),
  q(`Shantideva`, `Where would I possibly find enough leather
To cover the entire surface of the earth?
But with leather soles beneath my feet,
It's as if the whole world has been covered.`, `The Way of the Bodhisattva, 5.13, Padmakara translation (1997)`),

  q(`Mahatma Gandhi`, `The weak can never forgive. Forgiveness is the attribute of the strong.`, `Young India (April 2, 1931)`),
  q(`Mahatma Gandhi`, `I have nothing new to teach the world. Truth and non-violence are as old as the hills.`, `Harijan (March 28, 1936)`),
  q(`B. R. Ambedkar`, `I measure the progress of a community by the degree of progress which women have achieved.`, `Speech at the Depressed Classes Women's Conference, Nagpur (July 20, 1942)`),

  q(`Ashoka`, `Contact between religions is good. One should listen to and respect the doctrines professed by others.`, `Rock Edict XII (c. 250 BC), Ven. S. Dhammika translation (1993)`),

  // ─── Persia and the Arab world ───────────────────────────────────────

  q(`Rumi`, `Listen to the reed how it tells a tale, complaining of separations.`, `Masnavi, Book I, R. A. Nicholson translation (1926)`),
  q(`Rumi`, `Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there.`, `Coleman Barks translation, The Essential Rumi (1995)`),
  q(`Saadi`, `Human beings are members of a whole,
In creation of one essence and soul.`, `Gulistan, Chapter I (1258)`),

  q(`Ibn al-Haytham`, `The duty of the man who investigates the writings of scientists, if learning the truth is his goal, is to make himself an enemy of all that he reads.`, `Doubts Concerning Ptolemy (c. 1025), A. I. Sabra translation`),

  // ─── Africa ─────────────────────────────────────────────────────────

  q(`Nelson Mandela`, `I learned that courage was not the absence of fear, but the triumph over it.`, `Long Walk to Freedom (1994)`),
  q(`Nelson Mandela`, `For to be free is not merely to cast off one's chains, but to live in a way that respects and enhances the freedom of others.`, `Long Walk to Freedom (1994)`),
  q(`Nelson Mandela`, `No one is born hating another person because of the colour of his skin, or his background, or his religion.`, `Long Walk to Freedom (1994)`),

  q(`Desmond Tutu`, `If you are neutral in situations of injustice, you have chosen the side of the oppressor.`, `As quoted in Robert McAfee Brown, Unexpected News (1984)`),
  q(`Wangari Maathai`, `We cannot tire or give up. We owe it to the present and future generations of all species to rise up and walk!`, `Nobel Lecture (December 10, 2004)`),

  q(`Wole Soyinka`, `The man dies in all who keep silent in the face of tyranny.`, `The Man Died (1972)`),

  q(`Steve Biko`, `The most potent weapon in the hands of the oppressor is the mind of the oppressed.`, `Speech in Cape Town (1971), I Write What I Like (1978)`),

  q(`Frantz Fanon`, `O my body, make of me always a man who questions!`, `Black Skin, White Masks, Charles Lam Markmann translation (1967)`),

  // ─── Science and mathematics ────────────────────────────────────────

  q(`Charles Darwin`, `From so simple a beginning endless forms most beautiful and most wonderful have been, and are being, evolved.`, `On the Origin of Species, Conclusion (1859)`),
  q(`Charles Darwin`, `Ignorance more frequently begets confidence than does knowledge.`, `The Descent of Man, Introduction (1871)`),
  q(`Charles Darwin`, `A man who dares to waste one hour of time has not discovered the value of life.`, `Letter to his sister Susan (August 4, 1836)`),

  q(`Michael Faraday`, `Nothing is too wonderful to be true, if it be consistent with the laws of nature.`, `Laboratory journal (March 19, 1849)`),

  q(`Galileo Galilei`, `Philosophy is written in this grand book, the universe, which stands continually open to our gaze.`, `The Assayer (1623), Stillman Drake translation (1957)`),

  q(`Ada Lovelace`, `The Analytical Engine weaves algebraical patterns just as the Jacquard-loom weaves flowers and leaves.`, `Notes on Menabrea's "Sketch of the Analytical Engine" (1843)`),
  q(`Louis Pasteur`, `In the fields of observation chance favours only the prepared mind.`, `Lecture at the University of Lille (December 7, 1854)`),

  q(`Henri Poincaré`, `Science is built up of facts, as a house is built of stones; but an accumulation of facts is no more a science than a heap of stones is a house.`, `Science and Hypothesis (1902)`),
  q(`Henri Poincaré`, `Thought is only a flash between two long nights, but this flash is everything.`, `The Value of Science (1905)`),

  q(`G. H. Hardy`, `Beauty is the first test: there is no permanent place in the world for ugly mathematics.`, `A Mathematician's Apology (1940)`),
  q(`G. H. Hardy`, `A mathematician, like a painter or a poet, is a maker of patterns.`, `A Mathematician's Apology (1940)`),
  q(`Alan Turing`, `We can only see a short distance ahead, but we can see plenty there that needs to be done.`, `"Computing Machinery and Intelligence" (1950)`),

  q(`Werner Heisenberg`, `What we observe is not nature itself, but nature exposed to our method of questioning.`, `Physics and Philosophy (1958)`),

  q(`Rosalind Franklin`, `Science and everyday life cannot and should not be separated.`, `Letter to her father (c. 1940)`),

  q(`Rachel Carson`, `Those who contemplate the beauty of the earth find reserves of strength that will endure as long as life lasts.`, `The Sense of Wonder (1965)`),
  q(`Rachel Carson`, `The more clearly we can focus our attention on the wonders and realities of the universe about us, the less taste we shall have for destruction.`, `Speech accepting the John Burroughs Medal (April 1952)`),

  q(`Jacob Bronowski`, `Knowledge is not a loose-leaf notebook of facts. Above all, it is a responsibility for the integrity of what we are.`, `The Ascent of Man, Chapter 11 (1973)`),

  q(`Oliver Sacks`, `Above all, I have been a sentient being, a thinking animal, on this beautiful planet, and that in itself has been an enormous privilege and adventure.`, `"My Own Life," Gratitude (2015)`),

  q(`Stephen Hawking`, `Remember to look up at the stars and not down at your feet.`, `Opening Ceremony of the London Paralympic Games (August 29, 2012)`),

  q(`Leonardo da Vinci`, `Iron rusts from disuse; stagnant water loses its purity and in cold weather becomes frozen; even so does inaction sap the vigour of the mind.`, `Notebooks, Jean Paul Richter translation (1883)`),

  // ─── Nature ─────────────────────────────────────────────────────────

  q(`John Muir`, `When we try to pick out anything by itself, we find it hitched to everything else in the Universe.`, `My First Summer in the Sierra (1911)`),
  q(`John Muir`, `In every walk with nature one receives far more than he seeks.`, `Steep Trails (1918)`),
  q(`Aldo Leopold`, `We abuse land because we regard it as a commodity belonging to us. When we see land as a community to which we belong, we may begin to use it with love and respect.`, `A Sand County Almanac, Foreword (1949)`),
  q(`Aldo Leopold`, `Only the mountain has lived long enough to listen objectively to the howl of a wolf.`, `A Sand County Almanac, "Thinking Like a Mountain" (1949)`),

  q(`Ohiyesa`, `Silence is the cornerstone of character.`, `The Soul of the Indian (1911)`),

  q(`Mary Oliver`, `Tell me, what is it you plan to do
with your one wild and precious life?`, `"The Summer Day," House of Light (1990)`),
  q(`Mary Oliver`, `Attention is the beginning of devotion.`, `Upstream (2016)`),

  q(`Wendell Berry`, `The mind that is not baffled is not employed.`, `"Poetry and Marriage," Standing by Words (1983)`),

  q(`Annie Dillard`, `How we spend our days is, of course, how we spend our lives.`, `The Writing Life (1989)`),

  // ─── Philosophy ─────────────────────────────────────────────────────

  q(`Blaise Pascal`, `All the unhappiness of men arises from one single fact, that they cannot stay quietly in their own chamber.`, `Pensées, 139, W. F. Trotter translation (1910)`),
  q(`Blaise Pascal`, `The heart has its reasons, which reason does not know.`, `Pensées, 277, W. F. Trotter translation (1910)`),
  q(`Blaise Pascal`, `Man is but a reed, the most feeble thing in nature; but he is a thinking reed.`, `Pensées, 347, W. F. Trotter translation (1910)`),
  q(`René Descartes`, `It is not enough to have a good mind; the main thing is to use it well.`, `Discourse on the Method, Part I (1637)`),

  q(`Baruch Spinoza`, `All things excellent are as difficult as they are rare.`, `Ethics, Part V, R. H. M. Elwes translation (1883)`),
  q(`Baruch Spinoza`, `I have laboured carefully, not to mock, lament, or execrate, but to understand human actions.`, `Political Treatise, Chapter I, R. H. M. Elwes translation (1883)`),

  q(`Immanuel Kant`, `Two things fill the mind with ever new and increasing admiration and awe: the starry heavens above and the moral law within.`, `Critique of Practical Reason, Conclusion, T. K. Abbott translation (1889)`),
  q(`Voltaire`, `We must cultivate our garden.`, `Candide, Chapter 30 (1759)`),
  q(`Johann Wolfgang von Goethe`, `One ought, every day at least, to hear a little song, read a good poem, see a fine picture, and, if it were possible, to speak a few reasonable words.`, `Wilhelm Meister's Apprenticeship, Book V, Thomas Carlyle translation (1824)`),
  q(`Johann Wolfgang von Goethe`, `Everything has been thought of before, but the problem is to think of it again.`, `Maxims and Reflections (1833)`),
  q(`Søren Kierkegaard`, `Life can only be understood backwards; but it must be lived forwards.`, `Journals (1843)`),
  q(`Søren Kierkegaard`, `Anxiety is the dizziness of freedom.`, `The Concept of Anxiety (1844)`),

  q(`William James`, `The art of being wise is the art of knowing what to overlook.`, `The Principles of Psychology, Chapter XXII (1890)`),
  q(`William James`, `My experience is what I agree to attend to.`, `The Principles of Psychology, Chapter XI (1890)`),

  q(`Albert Camus`, `In the midst of winter, I found there was, within me, an invincible summer.`, `"Return to Tipasa" (1952)`),
  q(`Albert Camus`, `The struggle itself toward the heights is enough to fill a man's heart. One must imagine Sisyphus happy.`, `The Myth of Sisyphus, Justin O'Brien translation (1955)`),
  q(`Albert Camus`, `Real generosity toward the future lies in giving all to the present.`, `The Rebel, Anthony Bower translation (1953)`),

  q(`Simone Weil`, `Attention is the rarest and purest form of generosity.`, `Letter to Joë Bousquet (April 13, 1942)`),
  q(`Simone Weil`, `To be rooted is perhaps the most important and least recognized need of the human soul.`, `The Need for Roots (1949)`),

  q(`Simone de Beauvoir`, `One is not born, but rather becomes, a woman.`, `The Second Sex (1949)`),

  q(`Hannah Arendt`, `The sad truth is that most evil is done by people who never make up their minds to be good or evil.`, `The Life of the Mind (1978)`),
  q(`Hannah Arendt`, `Storytelling reveals meaning without committing the error of defining it.`, `"Isak Dinesen," Men in Dark Times (1968)`),

  q(`Iris Murdoch`, `Love is the extremely difficult realisation that something other than oneself is real.`, `"The Sublime and the Good" (1959)`),

  q(`Martin Buber`, `All real living is meeting.`, `I and Thou, Ronald Gregor Smith translation (1937)`),

  q(`Abraham Joshua Heschel`, `Wonder rather than doubt is the root of all knowledge.`, `Man Is Not Alone (1951)`),

  q(`Viktor Frankl`, `Everything can be taken from a man but one thing: the last of the human freedoms - to choose one's attitude in any given set of circumstances, to choose one's own way.`, `Man's Search for Meaning (1959)`),
  q(`Viktor Frankl`, `When we are no longer able to change a situation, we are challenged to change ourselves.`, `Man's Search for Meaning (1959)`),

  q(`Erich Fromm`, `Love is an activity, not a passive affect; it is a "standing in," not a "falling for."`, `The Art of Loving (1956)`),

  q(`Carl Rogers`, `The curious paradox is that when I accept myself just as I am, then I can change.`, `On Becoming a Person (1961)`),

  q(`Abraham Maslow`, `I suppose it is tempting, if the only tool you have is a hammer, to treat everything as if it were a nail.`, `The Psychology of Science (1966)`),

  q(`Maria Montessori`, `The greatest sign of success for a teacher is to be able to say, "The children are now working as if I did not exist."`, `The Absorbent Mind (1949)`),

  q(`Albert Schweitzer`, `I am life which wills to live, in the midst of life which wills to live.`, `Out of My Life and Thought (1933)`),

  q(`Thomas Merton`, `Every moment and every event of every man's life on earth plants something in his soul.`, `New Seeds of Contemplation (1961)`),

  q(`Julian of Norwich`, `All shall be well, and all shall be well, and all manner of thing shall be well.`, `Revelations of Divine Love, Chapter 27 (c. 1395)`),

  q(`Sor Juana Inés de la Cruz`, `I do not study to know more, but to ignore less.`, `Reply to Sor Filotea (1691)`),

  q(`Joseph Campbell`, `Follow your bliss.`, `The Power of Myth (1988)`),
  // ─── Literature ─────────────────────────────────────────────────────

  q(`Rainer Maria Rilke`, `Be patient toward all that is unsolved in your heart and try to love the questions themselves.`, `Letters to a Young Poet, M. D. Herter Norton translation (1934)`),
  q(`Rainer Maria Rilke`, `Live the questions now. Perhaps you will then gradually, without noticing it, live along some distant day into the answer.`, `Letters to a Young Poet, M. D. Herter Norton translation (1934)`),
  q(`Rainer Maria Rilke`, `Perhaps all the dragons of our lives are princesses who are only waiting to see us once beautiful and brave.`, `Letters to a Young Poet, M. D. Herter Norton translation (1934)`),

  q(`Leo Tolstoy`, `The strongest of all warriors are these two - Time and Patience.`, `War and Peace, Book X, Louise and Aylmer Maude translation (1922)`),
  q(`Leo Tolstoy`, `Everyone thinks of changing humanity, and nobody thinks of changing himself.`, `"Three Methods of Reform" (1900)`),

  q(`Fyodor Dostoevsky`, `For the secret of man's being is not only to live but to have something to live for.`, `The Brothers Karamazov, Constance Garnett translation (1912)`),
  q(`Fyodor Dostoevsky`, `Beauty will save the world.`, `The Idiot (1869)`),

  q(`Victor Hugo`, `One can resist the invasion of armies; one cannot resist the invasion of ideas.`, `The History of a Crime (1877)`),

  q(`Hermann Hesse`, `Wisdom is not communicable. The wisdom which a wise man tries to communicate always sounds foolish.`, `Siddhartha, Hilda Rosner translation (1951)`),
  q(`Virginia Woolf`, `Lock up your libraries if you like; but there is no gate, no lock, no bolt that you can set upon the freedom of my mind.`, `A Room of One's Own (1929)`),
  q(`Virginia Woolf`, `One cannot think well, love well, sleep well, if one has not dined well.`, `A Room of One's Own (1929)`),

  q(`George Eliot`, `What do we live for, if it is not to make life less difficult to each other?`, `Middlemarch, Chapter 72 (1872)`),
  q(`George Eliot`, `The growing good of the world is partly dependent on unhistoric acts.`, `Middlemarch, Finale (1872)`),

  q(`Mary Shelley`, `Nothing is so painful to the human mind as a great and sudden change.`, `Frankenstein, Chapter 23 (1818)`),
  q(`Charlotte Brontë`, `I am no bird; and no net ensnares me: I am a free human being with an independent will.`, `Jane Eyre, Chapter 23 (1847)`),

  q(`Louisa May Alcott`, `I'm not afraid of storms, for I'm learning how to sail my ship.`, `Little Women, Chapter 44 (1868)`),

  q(`Robert Louis Stevenson`, `To travel hopefully is a better thing than to arrive.`, `"El Dorado," Virginibus Puerisque (1881)`),

  q(`Antoine de Saint-Exupéry`, `Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.`, `Wind, Sand and Stars (1939)`),
  q(`Antoine de Saint-Exupéry`, `It is only with the heart that one can see rightly; what is essential is invisible to the eye.`, `The Little Prince, Chapter 21 (1943)`),

  q(`J. R. R. Tolkien`, `All we have to decide is what to do with the time that is given us.`, `The Fellowship of the Ring (1954)`),
  q(`Ursula K. Le Guin`, `It is good to have an end to journey toward; but it is the journey that matters, in the end.`, `The Left Hand of Darkness (1969)`),
  q(`Ursula K. Le Guin`, `To light a candle is to cast a shadow.`, `A Wizard of Earthsea (1968)`),

  q(`Octavia E. Butler`, `All that you touch
You Change.
All that you Change
Changes you.`, `Parable of the Sower (1993)`),

  q(`Kurt Vonnegut`, `We are what we pretend to be, so we must be careful about what we pretend to be.`, `Mother Night, Introduction (1966)`),

  q(`Gabriel García Márquez`, `Life is not what one lived, but what one remembers and how one remembers it in order to recount it.`, `Living to Tell the Tale, Edith Grossman translation (2003)`),

  q(`Octavio Paz`, `Solitude is the profoundest fact of the human condition.`, `The Labyrinth of Solitude (1950)`),

  q(`Gabriela Mistral`, `Many things we need can wait. The child cannot.`, `"His Name Is Today" (1948)`),

  q(`James Baldwin`, `Not everything that is faced can be changed, but nothing can be changed until it is faced.`, `"As Much Truth As One Can Bear," The New York Times Book Review (January 14, 1962)`),
  q(`James Baldwin`, `Love takes off the masks that we fear we cannot live without and know we cannot live within.`, `The Fire Next Time (1963)`),
  q(`James Baldwin`, `People are trapped in history and history is trapped in them.`, `"Stranger in the Village," Notes of a Native Son (1955)`),

  q(`Toni Morrison`, `Definitions belong to the definers, not the defined.`, `Beloved (1987)`),

  q(`Maya Angelou`, `There is no greater agony than bearing an untold story inside you.`, `I Know Why the Caged Bird Sings (1969)`),
  q(`Maya Angelou`, `You may trod me in the very dirt
But still, like dust, I'll rise.`, `"Still I Rise," And Still I Rise (1978)`),

  q(`Zora Neale Hurston`, `There are years that ask questions and years that answer.`, `Their Eyes Were Watching God (1937)`),
  q(`Zora Neale Hurston`, `Research is formalized curiosity. It is poking and prying with a purpose.`, `Dust Tracks on a Road (1942)`),

  q(`Audre Lorde`, `Your silence will not protect you.`, `"The Transformation of Silence into Language and Action" (1977)`),
  q(`bell hooks`, `The moment we choose to love we begin to move against domination, against oppression.`, `Outlaw Culture (1994)`),

  q(`Anne Frank`, `How wonderful it is that nobody need wait a single moment before starting to improve the world.`, `"Give!," Tales from the Secret Annex (March 26, 1944)`),
  q(`Anne Frank`, `In spite of everything I still believe that people are really good at heart.`, `The Diary of a Young Girl (July 15, 1944)`),

  // ─── Leaders and activists ──────────────────────────────────────────

  q(`Martin Luther King Jr.`, `Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.`, `Strength to Love (1963)`),
  q(`Martin Luther King Jr.`, `Injustice anywhere is a threat to justice everywhere.`, `"Letter from Birmingham Jail" (April 16, 1963)`),
  q(`Martin Luther King Jr.`, `The arc of the moral universe is long, but it bends toward justice.`, `"Our God Is Marching On," Montgomery (March 25, 1965)`),
  q(`Martin Luther King Jr.`, `We must accept finite disappointment, but never lose infinite hope.`, `"Shattered Dreams," Strength to Love (1963)`),
  q(`Abraham Lincoln`, `With malice toward none, with charity for all, with firmness in the right as God gives us to see the right, let us strive on to finish the work we are in.`, `Second Inaugural Address (March 4, 1865)`),
  q(`Eleanor Roosevelt`, `You gain strength, courage, and confidence by every experience in which you really stop to look fear in the face.`, `You Learn by Living (1960)`),

  q(`Václav Havel`, `Hope is definitely not the same thing as optimism. It is not the conviction that something will turn out well, but the certainty that something makes sense, regardless of how it turns out.`, `Disturbing the Peace (1986)`),

  q(`Dag Hammarskjöld`, `For all that has been - Thanks! For all that shall be - Yes!`, `Markings, W. H. Auden and Leif Sjöberg translation (1964)`),

  q(`Aung San Suu Kyi`, `It is not power that corrupts but fear.`, `"Freedom from Fear" (1990)`),

  q(`Elie Wiesel`, `The opposite of love is not hate, it's indifference.`, `U.S. News & World Report (October 27, 1986)`),

  // ─── Art and music ──────────────────────────────────────────────────

  q(`Vincent van Gogh`, `The fishermen know that the sea is dangerous and the storm terrible, but they have never found these dangers sufficient reason for remaining ashore.`, `Letter to Theo van Gogh (1882)`),
  q(`Vincent van Gogh`, `I often think that the night is more alive and more richly coloured than the day.`, `Letter to Theo van Gogh (September 8, 1888)`),
  q(`Vincent van Gogh`, `If you hear a voice within you say "you cannot paint," then by all means paint, and that voice will be silenced.`, `Letter to Theo van Gogh (October 28, 1883)`),

  q(`Paul Klee`, `Art does not reproduce the visible; rather, it makes visible.`, `"Creative Credo" (1920)`),

  q(`Georgia O'Keeffe`, `Nobody sees a flower really - it is so small - we haven't time, and to see takes time, like to have a friend takes time.`, `"About Myself," exhibition catalogue (1939)`),

  q(`Frida Kahlo`, `Feet, what do I need you for when I have wings to fly?`, `Diary (1953)`),

  q(`John Cage`, `I have nothing to say
and I am saying it
and that is poetry.`, `"Lecture on Nothing," Silence (1961)`),

  q(`Dieter Rams`, `Less, but better.`, `Ten Principles for Good Design (c. 1980)`),
];
