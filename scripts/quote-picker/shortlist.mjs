// The shortlist so far: the quotes chosen in the first round (see README.md).

// Quotes already in QuotesText.ts that were kept, by their ID there.
export const KEPT_CURRENT_IDS = [
  1, 2, 3, 5, 6, 7, 8, 9, 12, 18, 20, 21, 29, 32, 34, 45, 46, 47, 53, 60, 85, 91, 92, 93, 94, 95, 100, 102, 105, 108, 110, 111, 112, 113, 114, 116, 117, 119, 120, 122, 125, 129, 133, 136, 138, 140, 153, 164, 165, 166, 168, 171, 175, 176, 181, 187, 189, 192, 193, 194, 197, 198, 200, 202, 204, 205,
];

const q = (id, author, text, source) => ({ id, author, text, source });

// First-round candidates that were kept, with the IDs they were chosen by.
export const KEPT_CANDIDATES = [
  q(210, `Ralph Waldo Emerson`, `Nothing can bring you peace but yourself.`, `"Self-Reliance," Essays: First Series (1841)`),
  q(211, `Ralph Waldo Emerson`, `The invariable mark of wisdom is to see the miraculous in the common.`, `Nature, Chapter VIII (1836)`),
  q(212, `Henry David Thoreau`, `I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach.`, `Walden, "Where I Lived, and What I Lived For" (1854)`),
  q(226, `Walt Whitman`, `Re-examine all you have been told at school or church or in any book, dismiss whatever insults your own soul.`, `Preface, Leaves of Grass (1855)`),
  q(233, `Bertrand Russell`, `The fundamental cause of the trouble is that in the modern world the stupid are cocksure while the intelligent are full of doubt.`, `"The Triumph of Stupidity" (1933)`),
  q(238, `Epictetus`, `It is impossible for a man to learn what he thinks he already knows.`, `Discourses, Book II, Chapter 17`),
  q(242, `Dhammapada`, `As a solid rock is not shaken by the wind, so wise people falter not amidst blame and praise.`, `Verse 81, Pandita Vagga, F. Max Müller translation (1881)`),
  q(243, `Thich Nhat Hanh`, `The present moment is filled with joy and happiness. If you are attentive, you will see it.`, `Peace Is Every Step (1991)`),
  q(244, `Shunryu Suzuki`, `When you do something, you should burn yourself completely, like a good bonfire, leaving no trace of yourself.`, `Zen Mind, Beginner's Mind (1970)`),
  q(250, `Michel de Montaigne`, `Children's games are not games, and must be judged in children as their most serious actions.`, `Essays, "Of Custom" (1580)`),
  q(259, `Niels Bohr`, `How wonderful that we have met with a paradox. Now we have some hope of making progress.`, `As quoted in Ruth Moore, Niels Bohr: The Man, His Science, and the World They Changed (1966)`),
  q(267, `James P. Carse`, `To be prepared against surprise is to be trained. To be prepared for surprise is to be educated.`, `Finite and Infinite Games (1986)`),
  q(269, `Bernard Suits`, `Playing a game is the voluntary attempt to overcome unnecessary obstacles.`, `The Grasshopper: Games, Life and Utopia (1978)`),
  q(270, `D. W. Winnicott`, `It is in playing and only in playing that the individual child or adult is able to be creative and to use the whole personality.`, `Playing and Reality (1971)`),
  q(278, `Arthur Schopenhauer`, `It is Fate which shuffles the cards, and we who play.`, `Counsels and Maxims, T. Bailey Saunders translation (1890)`),
  q(279, `Arthur Schopenhauer`, `Talent hits a target no one else can hit; genius hits a target no one else can see.`, `The World as Will and Representation, Volume II (1844)`),
  q(280, `Arthur Schopenhauer`, `Every man takes the limits of his own field of vision for the limits of the world.`, `Studies in Pessimism, T. Bailey Saunders translation (1893)`),
  q(326, `Sun Tzu`, `Water shapes its course according to the nature of the ground over which it flows.`, `The Art of War, Chapter VI, Lionel Giles translation (1910)`),
  q(342, `Li Bai`, `We sit together, the mountain and me,
until only the mountain remains.`, `"Zazen on Ching-t'ing Mountain," Sam Hamill translation (1987)`),
  q(380, `Charles Darwin`, `Ignorance more frequently begets confidence than does knowledge.`, `The Descent of Man, Introduction (1871)`),
  q(435, `Erich Fromm`, `Love is an activity, not a passive affect; it is a "standing in," not a "falling for."`, `The Art of Loving (1956)`),
  q(436, `Carl Rogers`, `The curious paradox is that when I accept myself just as I am, then I can change.`, `On Becoming a Person (1961)`),
  q(438, `Maria Montessori`, `The greatest sign of success for a teacher is to be able to say, "The children are now working as if I did not exist."`, `The Absorbent Mind (1949)`),
  q(444, `Rainer Maria Rilke`, `Be patient toward all that is unsolved in your heart and try to love the questions themselves.`, `Letters to a Young Poet, M. D. Herter Norton translation (1934)`),
  q(446, `Rainer Maria Rilke`, `Perhaps all the dragons of our lives are princesses who are only waiting to see us once beautiful and brave.`, `Letters to a Young Poet, M. D. Herter Norton translation (1934)`),
  q(448, `Leo Tolstoy`, `Everyone thinks of changing humanity, and nobody thinks of changing himself.`, `"Three Methods of Reform" (1900)`),
  q(449, `Fyodor Dostoevsky`, `For the secret of man's being is not only to live but to have something to live for.`, `The Brothers Karamazov, Constance Garnett translation (1912)`),
  q(452, `Hermann Hesse`, `Wisdom is not communicable. The wisdom which a wise man tries to communicate always sounds foolish.`, `Siddhartha, Hilda Rosner translation (1951)`),
  q(461, `Antoine de Saint-Exupéry`, `Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.`, `Wind, Sand and Stars (1939)`),
  q(473, `James Baldwin`, `People are trapped in history and history is trapped in them.`, `"Stranger in the Village," Notes of a Native Son (1955)`),
  q(475, `Maya Angelou`, `There is no greater agony than bearing an untold story inside you.`, `I Know Why the Caged Bird Sings (1969)`),
  q(477, `Zora Neale Hurston`, `There are years that ask questions and years that answer.`, `Their Eyes Were Watching God (1937)`),
  q(478, `Zora Neale Hurston`, `Research is formalized curiosity. It is poking and prying with a purpose.`, `Dust Tracks on a Road (1942)`),
  q(482, `Anne Frank`, `In spite of everything I still believe that people are really good at heart.`, `The Diary of a Young Girl (July 15, 1944)`),
  q(484, `Martin Luther King Jr.`, `Injustice anywhere is a threat to justice everywhere.`, `"Letter from Birmingham Jail" (April 16, 1963)`),
  q(493, `Vincent van Gogh`, `The fishermen know that the sea is dangerous and the storm terrible, but they have never found these dangers sufficient reason for remaining ashore.`, `Letter to Theo van Gogh (1882)`),
  q(494, `Vincent van Gogh`, `I often think that the night is more alive and more richly coloured than the day.`, `Letter to Theo van Gogh (September 8, 1888)`),
  q(496, `Paul Klee`, `Art does not reproduce the visible; rather, it makes visible.`, `"Creative Credo" (1920)`),
  q(497, `Georgia O'Keeffe`, `Nobody sees a flower really - it is so small - we haven't time, and to see takes time, like to have a friend takes time.`, `"About Myself," exhibition catalogue (1939)`),
  q(499, `John Cage`, `I have nothing to say
and I am saying it
and that is poetry.`, `"Lecture on Nothing," Silence (1961)`),
  q(500, `Dieter Rams`, `Less, but better.`, `Ten Principles for Good Design (c. 1980)`),
];
