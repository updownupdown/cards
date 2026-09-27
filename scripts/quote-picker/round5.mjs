// Fifth-round candidates: Rilke and writers in his vein, psychology and
// therapy, and healing, illness and grief. The first one here is ID 861, and
// so on in order: keep the order stable once IDs have been exported.

export const FIRST_ID = 861;

const q = (author, text, source) => ({ author, text, source });

export const CANDIDATES = [
  // ─── Rainer Maria Rilke ─────────────────────────────────────────────

  q(`Rainer Maria Rilke`, `Let everything happen to you: beauty and terror. Just keep going. No feeling is final.`, `The Book of Hours, I, 59, Anita Barrows and Joanna Macy translation (1996)`),
  q(`Rainer Maria Rilke`, `I live my life in widening circles
that reach out across the world.`, `The Book of Hours, I, 2, Anita Barrows and Joanna Macy translation (1996)`),
  q(`Rainer Maria Rilke`, `You must change your life.`, `"Archaic Torso of Apollo," New Poems (1908)`),
  q(`Rainer Maria Rilke`, `Winning does not tempt that man. This is how he grows: by being defeated, decisively, by constantly greater beings.`, `"The Man Watching," Robert Bly translation (1981)`),
  q(`Rainer Maria Rilke`, `Love consists in this, that two solitudes protect and border and salute each other.`, `Letters to a Young Poet, Letter 7, M. D. Herter Norton translation (1934)`),
  q(`Rainer Maria Rilke`, `For one human being to love another: that is perhaps the most difficult of all our tasks, the ultimate, the last test and proof, the work for which all other work is but preparation.`, `Letters to a Young Poet, Letter 7, M. D. Herter Norton translation (1934)`),
  q(`Rainer Maria Rilke`, `Go into yourself.`, `Letters to a Young Poet, Letter 1, M. D. Herter Norton translation (1934)`),
  q(`Rainer Maria Rilke`, `I hold this to be the highest task for a bond between two people: that each protects the solitude of the other.`, `Letter to Emanuel von Bodman (August 17, 1901)`),
  q(`Rainer Maria Rilke`, `Surely all art is the result of one's having been in danger, of having gone through an experience all the way to the end, to where no one can go any further.`, `Letter to Clara Rilke (June 24, 1907)`),
  q(`Rainer Maria Rilke`, `Do not believe that he who seeks to comfort you lives untroubled among the simple and quiet words that sometimes do you good.`, `Letters to a Young Poet, Letter 8, M. D. Herter Norton translation (1934)`),
  q(`Rainer Maria Rilke`, `The future enters into us, in order to transform itself in us, long before it happens.`, `Letters to a Young Poet, Letter 8, M. D. Herter Norton translation (1934)`),
  q(`Rainer Maria Rilke`, `Who, if I cried out, would hear me among the angels'
hierarchies?`, `Duino Elegies, First Elegy, Stephen Mitchell translation (1982)`),
  q(`Rainer Maria Rilke`, `Everything is gestation and then bringing forth.`, `Letters to a Young Poet, Letter 3, M. D. Herter Norton translation (1934)`),

  // ─── In Rilke's vein ────────────────────────────────────────────────

  q(`Hermann Hesse`, `Trees are sanctuaries. Whoever knows how to speak to them, whoever knows how to listen to them, can learn the truth.`, `"Trees," Wandering, James Wright translation (1972)`),
  q(`Hermann Hesse`, `Eternity is a mere moment, just long enough for a joke.`, `Steppenwolf, Basil Creighton translation (1929)`),
  q(`Hermann Hesse`, `Solitude is independence.`, `Steppenwolf, Basil Creighton translation (1929)`),
  q(`Hermann Hesse`, `I wanted only to try to live in accord with the promptings which came from my true self. Why was that so very difficult?`, `Demian, Michael Roloff and Michael Lebeck translation (1965)`),

  q(`Friedrich Hölderlin`, `But where danger is, grows
The saving power also.`, `"Patmos" (1803)`),

  q(`Novalis`, `Where are we really going? Always home.`, `Heinrich von Ofterdingen (1802)`),

  q(`Fernando Pessoa`, `To be great, be whole.`, `Ode by Ricardo Reis (February 14, 1933)`),

  q(`Mary Oliver`, `Someone I loved once gave me
a box full of darkness.
It took me years to understand
that this, too, was a gift.`, `"The Uses of Sorrow," Thirst (2006)`),
  q(`Mary Oliver`, `You do not have to be good.
You do not have to walk on your knees
for a hundred miles through the desert, repenting.
You only have to let the soft animal of your body
love what it loves.`, `"Wild Geese," Dream Work (1986)`),
  q(`Mary Oliver`, `Instructions for living a life:
Pay attention.
Be astonished.
Tell about it.`, `"Sometimes," Red Bird (2008)`),

  q(`David Whyte`, `Anything or anyone that does not bring you alive is too small for you.`, `"Sweet Darkness," The House of Belonging (1997)`),
  q(`David Whyte`, `The antidote to exhaustion is not necessarily rest. The antidote to exhaustion is wholeheartedness.`, `Crossing the Unknown Sea (2001), after Brother David Steindl-Rast`),

  q(`John O'Donohue`, `I would love to live
Like a river flows,
Carried by the surprise
Of its own unfolding.`, `"Fluent," Conamara Blues (2000)`),

  q(`Naomi Shihab Nye`, `Before you know what kindness really is
you must lose things.`, `"Kindness," Words Under the Words (1995)`),

  q(`Galway Kinnell`, `sometimes it is necessary
to reteach a thing its loveliness.`, `"Saint Francis and the Sow," Mortal Acts, Mortal Words (1980)`),

  q(`Jack Gilbert`, `We must have
the stubbornness to accept our gladness in the ruthless
furnace of this world.`, `"A Brief for the Defense," Refusing Heaven (2005)`),

  q(`Adam Zagajewski`, `Try to praise the mutilated world.`, `"Try to Praise the Mutilated World," Clare Cavanagh translation (2001)`),

  q(`Tomas Tranströmer`, `Two truths approach each other. One comes from inside, the other from outside, and where they meet we have a chance to catch sight of ourselves.`, `"Preludes," Robert Bly translation (1970)`),

  q(`Czesław Miłosz`, `The purpose of poetry is to remind us
how difficult it is to remain just one person.`, `"Ars Poetica?" (1968)`),

  q(`Wendell Berry`, `I come into the peace of wild things
who do not tax their lives with forethought
of grief.`, `"The Peace of Wild Things" (1968)`),

  q(`Emily Dickinson`, `After great pain, a formal feeling comes -`, `Poem 341 (c. 1862)`),

  q(`Kahlil Gibran`, `Your joy is your sorrow unmasked.`, `The Prophet, "On Joy and Sorrow" (1923)`),
  q(`Kahlil Gibran`, `The deeper that sorrow carves into your being, the more joy you can contain.`, `The Prophet, "On Joy and Sorrow" (1923)`),

  q(`Anne Morrow Lindbergh`, `The sea does not reward those who are too anxious, too greedy, or too impatient.`, `Gift from the Sea (1955)`),
  q(`Anne Morrow Lindbergh`, `Only in growth, reform, and change, paradoxically enough, is true security to be found.`, `Gift from the Sea (1955)`),

  q(`Etty Hillesum`, `Sometimes the most important thing in a whole day is the rest we take between two deep breaths.`, `An Interrupted Life: The Diaries (1941-1943)`),

  q(`Henri Nouwen`, `The friend who can be silent with us in a moment of despair or confusion, who can stay with us in an hour of grief and bereavement, who can tolerate not knowing, not curing, not healing and face with us the reality of our powerlessness, that is a friend who cares.`, `Out of Solitude (1974)`),

  q(`Dietrich Bonhoeffer`, `We must learn to regard people less in the light of what they do or omit to do, and more in the light of what they suffer.`, `"After Ten Years," Letters and Papers from Prison (1942)`),

  q(`Simone Weil`, `Those who are unhappy have no need for anything in this world but people capable of giving them their attention.`, `Waiting for God (1951)`),

  q(`Thomas Merton`, `Love is our true destiny. We do not find the meaning of life by ourselves alone - we find it with another.`, `Love and Living (1979)`),

  // ─── Psychology and therapy ─────────────────────────────────────────

  q(`Sigmund Freud`, `Being entirely honest with oneself is a good exercise.`, `Letter to Wilhelm Fliess (October 15, 1897)`),
  q(`Sigmund Freud`, `Love and work.`, `His answer to what a healthy person should be able to do, as reported by Erik Erikson, Childhood and Society (1950)`),

  q(`Carl Jung`, `The meeting of two personalities is like the contact of two chemical substances: if there is any reaction, both are transformed.`, `Modern Man in Search of a Soul (1933)`),
  q(`Carl Jung`, `Loneliness does not come from having no people about one, but from being unable to communicate the things that seem important to oneself.`, `Memories, Dreams, Reflections (1962)`),
  q(`Carl Jung`, `The shoe that fits one person pinches another; there is no recipe for living that suits all cases.`, `Modern Man in Search of a Soul (1933)`),

  q(`Viktor Frankl`, `In some ways suffering ceases to be suffering at the moment it finds a meaning.`, `Man's Search for Meaning (1959)`),
  q(`Viktor Frankl`, `Live as if you were living already for the second time and as if you had acted the first time as wrongly as you are about to act now!`, `Man's Search for Meaning (1959)`),

  q(`Carl Rogers`, `What is most personal is most universal.`, `On Becoming a Person (1961)`),
  q(`Carl Rogers`, `The good life is a process, not a state of being. It is a direction not a destination.`, `On Becoming a Person (1961)`),

  q(`Erich Fromm`, `Man's main task in life is to give birth to himself, to become what he potentially is.`, `Man for Himself (1947)`),

  q(`D. W. Winnicott`, `It is a joy to be hidden, and disaster not to be found.`, `"Communicating and Not Communicating" (1963)`),
  q(`D. W. Winnicott`, `The good-enough mother starts off with an almost complete adaptation to her infant's needs, and as time proceeds she adapts less and less completely.`, `Playing and Reality (1971)`),

  q(`Abraham Maslow`, `What a man can be, he must be.`, `Motivation and Personality (1954)`),

  q(`Erik Erikson`, `Hope is both the earliest and the most indispensable virtue inherent in the state of being alive.`, `Insight and Responsibility (1964)`),

  q(`Karen Horney`, `Fortunately analysis is not the only way to resolve inner conflicts. Life itself still remains a very effective therapist.`, `Our Inner Conflicts (1945)`),

  q(`Rollo May`, `Freedom is man's capacity to take a hand in his own development.`, `Man's Search for Himself (1953)`),

  q(`Irvin D. Yalom`, `It's the relationship that heals.`, `The Gift of Therapy (2002)`),

  q(`John Bowlby`, `All of us, from the cradle to the grave, are happiest when life is organized as a series of excursions, long or short, from the secure base provided by our attachment figures.`, `A Secure Base (1988)`),

  q(`Fritz Perls`, `I do my thing and you do your thing. I am not in this world to live up to your expectations, and you are not in this world to live up to mine.`, `"Gestalt Prayer," Gestalt Therapy Verbatim (1969)`),

  q(`Virginia Satir`, `We need four hugs a day for survival. We need eight hugs a day for maintenance. We need twelve hugs a day for growth.`, `Attributed`),

  q(`Albert Ellis`, `The best years of your life are the ones in which you decide your problems are your own.`, `Attributed`),

  q(`Bessel van der Kolk`, `Being able to feel safe with other people is probably the single most important aspect of mental health.`, `The Body Keeps the Score (2014)`),

  q(`Gabor Maté`, `The question is not why the addiction, but why the pain.`, `In the Realm of Hungry Ghosts (2008)`),

  q(`Peter A. Levine`, `Trauma is a fact of life. It does not, however, have to be a life sentence.`, `Waking the Tiger (1997)`),

  q(`Judith Herman`, `Recovery can take place only within the context of relationships; it cannot occur in isolation.`, `Trauma and Recovery (1992)`),

  q(`Daniel J. Siegel`, `Where attention goes, neural firing flows and neural connection grows.`, `Mindsight (2010)`),

  q(`Kristin Neff`, `With self-compassion, we give ourselves the same kindness and care we'd give to a good friend.`, `Self-Compassion (2011)`),

  q(`Tara Brach`, `The boundary to what we can accept is the boundary to our freedom.`, `Radical Acceptance (2003)`),

  q(`Byron Katie`, `When I argue with reality, I lose - but only 100% of the time.`, `Loving What Is (2002)`),

  q(`Esther Perel`, `The quality of our relationships determines the quality of our lives.`, `As quoted in talks and interviews`),

  q(`Brené Brown`, `Owning our story and loving ourselves through that process is the bravest thing we'll ever do.`, `The Gifts of Imperfection (2010)`),

  q(`Andrew Solomon`, `The opposite of depression is not happiness, but vitality.`, `The Noonday Demon (2001)`),

  q(`William Styron`, `Depression is not the soul's annihilation; men and women who have recovered from the disease bear witness to what is probably its only saving grace: it is conquerable.`, `Darkness Visible (1990)`),

  q(`Kay Redfield Jamison`, `No amount of love can cure madness or unblacken one's dark moods. Love can help, it can make the pain more tolerable.`, `An Unquiet Mind (1995)`),

  // ─── Healing, illness and grief ─────────────────────────────────────

  q(`Rachel Naomi Remen`, `The most basic and powerful way to connect to another person is to listen. Just listen.`, `Kitchen Table Wisdom (1996)`),
  q(`Rachel Naomi Remen`, `We burn out not because we don't care but because we don't grieve.`, `Kitchen Table Wisdom (1996)`),

  q(`Cicely Saunders`, `You matter because you are you, and you matter to the end of your life.`, `As quoted in accounts of the hospice movement (1976)`),

  q(`Elisabeth Kübler-Ross`, `The most beautiful people we have known are those who have known defeat, known suffering, known struggle, known loss, and have found their way out of the depths.`, `Death: The Final Stage of Growth (1975)`),

  q(`Atul Gawande`, `Our most cruel failure in how we treat the sick and the aged is the failure to recognize that they have priorities beyond merely being safe and living longer.`, `Being Mortal (2014)`),

  q(`Florence Nightingale`, `Nature alone cures.`, `Notes on Nursing (1859)`),

  q(`Oliver Sacks`, `Music can lift us out of depression or move us to tears - it is a remedy, a tonic, orange juice for the ear.`, `Musicophilia (2007)`),

  q(`Albert Schweitzer`, `Each patient carries his own doctor inside him.`, `As quoted in Norman Cousins, Anatomy of an Illness (1979)`),

  q(`Seneca`, `It is part of the cure to wish to be cured.`, `Phaedra, line 249`),

  q(`C. S. Lewis`, `No one ever told me that grief felt so like fear.`, `A Grief Observed (1961)`),

  q(`Joan Didion`, `Life changes fast. Life changes in the instant.`, `The Year of Magical Thinking (2005)`),

  q(`Elizabeth II`, `Grief is the price we pay for love.`, `Message read at a memorial service in New York (September 21, 2001)`),

  q(`Thich Nhat Hanh`, `No mud, no lotus.`, `No Mud, No Lotus (2014)`),

  q(`Pema Chödrön`, `Nothing ever goes away until it has taught us what we need to know.`, `When Things Fall Apart (1997)`),
  q(`Pema Chödrön`, `Things falling apart is a kind of testing and also a kind of healing.`, `When Things Fall Apart (1997)`),

  q(`Jon Kabat-Zinn`, `Wherever you go, there you are.`, `Wherever You Go, There You Are (1994)`),

  q(`Sharon Salzberg`, `Mindfulness isn't difficult, we just need to remember to do it.`, `Real Happiness (2010)`),

  q(`Matt Haig`, `How to stop time: kiss. How to travel in time: read. How to escape time: music. How to feel time: write. How to release time: breathe.`, `Notes on a Nervous Planet (2018)`),

  q(`Jack Kornfield`, `If your compassion does not include yourself, it is incomplete.`, `Buddha's Little Instruction Book (1994)`),

  q(`Anne Lamott`, `Almost everything will work again if you unplug it for a few minutes, including you.`, `"12 Truths I Learned from Life and Writing," TED talk (April 2017)`),

  q(`David Steindl-Rast`, `It is not happiness that makes us grateful. It is gratefulness that makes us happy.`, `"Want to Be Happy? Be Grateful," TED talk (June 2013)`),

  q(`Desmond Tutu`, `Forgiving means abandoning your right to pay back the perpetrator in his own coin, but it is a loss that liberates the victim.`, `No Future Without Forgiveness (1999)`),

  q(`bell hooks`, `Rarely, if ever, are any of us healed in isolation. Healing is an act of communion.`, `All About Love (2000)`),
];
