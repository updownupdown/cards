"""Writes src/data/quote-authors.generated.ts: every quote author, their year
of birth and their portrait, from the author files here.

    python3 scripts/portraits/export.py

Each author file draws one unbroken line (draw() -> points) with the helpers
in dsl.py, face.py and parts.py: face on, in a 200 x 240 box, from the bottom
left to the bottom right. See docs/quotes.md.
"""

import importlib
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "../../src/data/quote-authors.generated.ts")
sys.path.insert(0, HERE)

# Module (file name) -> author (as written in QuotesText.ts), year of birth
# (an estimate is fine; negative is BC), year of death (None while living) and
# what the drawing is based on. The quotes collection lays authors out by year
# of birth and shows both years under the name.
AUTHORS = {
    "dhammapada": ("Dhammapada", -563, -483, "The Buddha: curls, the knot of wisdom, long earlobes, eyes closed."),
    "suntzu": ("Sun Tzu", -544, -496, "Hair in a topknot, a pointed beard, a crossed robe."),
    "zhuangzi": ("Zhuangzi", -369, -286, "Topknot with a pin, long thin moustache and wisp of beard, crossed robe."),
    "seneca": ("Seneca", -4, 65, "Thin unruly hair, short beard, gaunt (the pseudo-Seneca bust)."),
    "epictetus": ("Epictetus", 50, 135, "Bald crown, heavy brows, long pointed beard."),
    "aurelius": ("Marcus Aurelius", 121, 180, "Curls all round, and a curly beard (the Capitoline bust)."),
    "libai": ("Li Bai", 701, 762, "A topknot, a long thin moustache and a wisp of beard, a robe."),
    "montaigne": ("Michel de Montaigne", 1533, 1592, "Bald crown, moustache and short beard, a ruff."),
    "shakespeare": ("William Shakespeare", 1564, 1616, "Bald dome, bushy sides, moustache, pointed beard, wide collar (Droeshout engraving)."),
    "johnson": ("Samuel Johnson", 1709, 1784, "A full wig curling over the ears, a cravat."),
    "joubert": ("Joseph Joubert", 1754, 1824, "Hair swept back from a high brow, a high collar and cravat."),
    "wollstonecraft": ("Mary Wollstonecraft", 1759, 1797, "Loose curls framing the face, a fichu crossed at the neck."),
    "austen": ("Jane Austen", 1775, 1817, "A frilled cap, curls at the forehead."),
    "schopenhauer": ("Arthur Schopenhauer", 1788, 1860, "Bald on top with white tufts over the ears, a high collar and cravat."),
    "emerson": ("Ralph Waldo Emerson", 1803, 1882, "Side-parted hair over the ears, clean-shaven, high collar and cravat."),
    "darwin": ("Charles Darwin", 1809, 1882, "A bald dome, heavy brows and a long white beard (late photographs)."),
    "thoreau": ("Henry David Thoreau", 1817, 1862, "Parted hair, clean-shaven face with a beard under the jaw."),
    "douglass": ("Frederick Douglass", 1818, 1895, "A great swept-back mane, full beard, bow tie."),
    "whitman": ("Walt Whitman", 1819, 1892, "Slouch hat and a long curling beard (1880s photographs)."),
    "dostoevsky": ("Fyodor Dostoevsky", 1821, 1881, "A high receding brow, a thin beard, suit."),
    "tolstoy": ("Leo Tolstoy", 1828, 1910, "Swept-back hair, bushy brows and a long flowing beard, a peasant smock."),
    "vangogh": ("Vincent van Gogh", 1853, 1890, "Short hair and a short curly beard (the self-portraits)."),
    "wilde": ("Oscar Wilde", 1854, 1900, "Centre-parted wavy hair to the jaw, a flower in his lapel."),
    "washington": ("Booker T. Washington", 1856, 1915, "Close-cropped hair, moustache, suit and tie."),
    "shaw": ("George Bernard Shaw", 1856, 1950, "Bald crown, bushy brows, long pointed beard."),
    "curie": ("Marie Curie", 1867, 1934, "Hair drawn up into a knot, soft fringe, high-necked dress."),
    "dubois": ("W. E. B. Du Bois", 1868, 1963, "Bald crown, moustache and pointed goatee, suit and tie."),
    "montessori": ("Maria Montessori", 1870, 1952, "Hair drawn up into a bun, a high-necked dress."),
    "russell": ("Bertrand Russell", 1872, 1970, "Thick swept-back hair and his pipe."),
    "rilke": ("Rainer Maria Rilke", 1875, 1926, "Short hair, large eyes, a long drooping moustache, a high collar."),
    "jung": ("Carl Jung", 1875, 1961, "Short hair, round glasses and a moustache, suit and tie."),
    "schweitzer": ("Albert Schweitzer", 1875, 1965, "Unruly hair, a big drooping moustache, a bow tie."),
    "hesse": ("Hermann Hesse", 1877, 1962, "Close-cropped head and round glasses."),
    "klee": ("Paul Klee", 1879, 1940, "Short dark hair, large dark eyes, suit and tie."),
    "willrogers": ("Will Rogers", 1879, 1935, "A forelock of hair, a lopsided grin, a tie."),
    "keller": ("Helen Keller", 1880, 1968, "Softly waved hair, parted, a lace collar."),
    "gibran": ("Kahlil Gibran", 1883, 1931, "Side-parted hair and a moustache."),
    "ortega": ("José Ortega y Gasset", 1883, 1955, "Bald, heavy brows, suit and tie."),
    "bohr": ("Niels Bohr", 1885, 1962, "Receding swept-back hair, heavy brows, broad mouth."),
    "okeeffe": ("Georgia O'Keeffe", 1887, 1986, "Hair pulled back severely, a dark V-necked dress."),
    "hurston": ("Zora Neale Hurston", 1891, 1960, "A close-fitting hat low over the brow."),
    "parker": ("Dorothy Parker", 1893, 1967, "A dark bob, a lace collar."),
    "fuller": ("Buckminster Fuller", 1895, 1983, "Bald, thick round glasses, bow tie."),
    "krishnamurti": ("Jiddu Krishnamurti", 1895, 1986, "Hair swept back from a high brow, a plain kurta."),
    "winnicott": ("D. W. Winnicott", 1896, 1971, "Swept-back white hair, a kind smile, suit and tie."),
    "cslewis": ("C. S. Lewis", 1898, 1963, "Receding hair, a round face, suit and tie."),
    "hemingway": ("Ernest Hemingway", 1899, 1961, "Short hair, a full white beard, a fisherman's sweater."),
    "fromm": ("Erich Fromm", 1900, 1980, "Side-parted hair, square glasses, suit and tie."),
    "saintexupery": ("Antoine de Saint-Exupéry", 1900, 1944, "Short hair, a broad face, a pilot's open collar."),
    "carlrogers": ("Carl Rogers", 1902, 1987, "Bald, round glasses, a warm smile, a tie."),
    "steinbeck": ("John Steinbeck", 1902, 1968, "Swept-back hair, a moustache and short beard."),
    "suzuki": ("Shunryu Suzuki", 1904, 1971, "Shaven head, calm eyes, a Zen robe."),
    "frankl": ("Viktor Frankl", 1905, 1997, "Receding hair, heavy square glasses, suit and tie."),
    "bonhoeffer": ("Dietrich Bonhoeffer", 1906, 1945, "Short fair hair, round rimless glasses, suit and tie."),
    "drucker": ("Peter Drucker", 1909, 2005, "Bald, square glasses, suit and tie."),
    "lec": ("Stanisław Jerzy Lec", 1909, 1966, "Bald, a small moustache, suit and tie."),
    "wooden": ("John Wooden", 1910, 2010, "Short combed hair, round glasses, a smile, suit and tie."),
    "cage": ("John Cage", 1912, 1992, "Short hair and a broad, open smile, an open shirt."),
    "watts": ("Alan Watts", 1915, 1973, "Swept-back hair, a trimmed beard, a robe."),
    "simon": ("Herbert A. Simon", 1916, 2001, "Side-parted hair, round glasses, suit and tie."),
    "clarke": ("Arthur C. Clarke", 1917, 2008, "Bald, square glasses, a smile."),
    "feynman": ("Richard Feynman", 1918, 1988, "Swept-back wavy hair, a wide grin, open collar and jacket."),
    "solzhenitsyn": ("Aleksandr Solzhenitsyn", 1918, 2008, "Swept-back hair, a heavy brow, a beard along the jaw."),
    "asimov": ("Isaac Asimov", 1920, 1992, "Mutton-chop sideburns, square glasses, a bolo or bow tie."),
    "vonnegut": ("Kurt Vonnegut", 1922, 2007, "Unruly curly hair and a drooping moustache."),
    "calvino": ("Italo Calvino", 1923, 1985, "Receding hair, heavy dark brows, suit and tie."),
    "baldwin": ("James Baldwin", 1924, 1987, "Close-cropped hair, wide expressive eyes, suit and tie."),
    "suits": ("Bernard Suits", 1925, 2007, "Side-parted hair, glasses and a moustache."),
    "hanh": ("Thich Nhat Hanh", 1926, 2022, "Shaven head, gentle smile, high-collared robe."),
    "elizabethii": ("Elizabeth II", 1926, 2022, "Short curled hair, a string of pearls."),
    "fredrogers": ("Fred Rogers", 1928, 2003, "Side-parted hair, a gentle smile, a tie under his cardigan."),
    "angelou": ("Maya Angelou", 1928, 2014, "Short natural curls, a high neckline."),
    "dick": ("Philip K. Dick", 1928, 1982, "Swept hair and a full beard."),
    "mlk": ("Martin Luther King Jr.", 1929, 1968, "Close-cropped hair, a moustache, suit and tie."),
    "frank": ("Anne Frank", 1929, 1945, "Dark hair to the jaw, parted and pinned (the 1942 photographs)."),
    "leguin": ("Ursula K. Le Guin", 1929, 2018, "Short grey hair, parted, and a direct gaze."),
    "dijkstra": ("Edsger W. Dijkstra", 1930, 2002, "Receding hair, glasses and a beard."),
    "carse": ("James P. Carse", 1932, 2020, "Receding white hair and a trimmed white beard."),
    "plath": ("Sylvia Plath", 1932, 1963, "Long hair falling past the shoulders."),
    "rams": ("Dieter Rams", 1932, None, "Short combed hair, a dark shirt buttoned to the top."),
    "sagan": ("Carl Sagan", 1934, 1996, "Swept hair and his turtleneck under a jacket."),
    "dalailama": ("Dalai Lama XIV", 1935, None, "Close-cropped hair, square glasses, a broad smile, robe."),
    "henson": ("Jim Henson", 1936, 1990, "Long swept hair and a full beard."),
    "chodron": ("Pema Chödrön", 1936, None, "Shaven head, a warm smile, a robe."),
    "carlin": ("George Carlin", 1937, 2008, "Short hair and a trimmed beard."),
    "remen": ("Rachel Naomi Remen", 1938, None, "Short curly hair and glasses."),
    "cleese": ("John Cleese", 1939, None, "Side-parted hair, heavy brows, suit and tie."),
    "tomlin": ("Lily Tomlin", 1939, None, "Short hair with a fringe."),
    "herzog": ("Werner Herzog", 1942, None, "Short side-parted hair, heavy brows, a jacket."),
    "vanderkolk": ("Bessel van der Kolk", 1943, None, "Bald, round glasses and a short beard."),
    "hofstadter": ("Douglas Hofstadter", 1945, None, "A great mop of wavy hair."),
    "kornfield": ("Jack Kornfield", 1945, None, "Bald on top, a gentle smile, an open collar."),
    "stevemartin": ("Steve Martin", 1945, None, "Swept white hair, a grin, suit and tie."),
    "parton": ("Dolly Parton", 1946, None, "Big, teased and curled hair, a lace neckline."),
    "murakami": ("Haruki Murakami", 1949, None, "Short cropped hair, an open collar."),
    "robinwilliams": ("Robin Williams", 1951, 2014, "Short hair and a broad grin."),
    "stevenwright": ("Steven Wright", 1955, None, "Unruly curly hair and heavy-lidded eyes."),
    "philips": ("Emo Philips", 1956, None, "A pageboy haircut with a straight fringe."),
    "hedberg": ("Mitch Hedberg", 1968, 2005, "Long hair falling past the shoulders, tinted glasses."),
    "fey": ("Tina Fey", 1970, None, "Long hair, parted, and glasses."),
    "poehler": ("Amy Poehler", 1971, None, "A wavy bob."),
    "milne": ("A. A. Milne", 1882, 1956, "Side-parted hair, clean-shaven, suit and tie."),
    "grahame": ("Kenneth Grahame", 1859, 1932, "Hair swept back, a full moustache, a high collar and cravat."),
    "montgomery": ("L. M. Montgomery", 1874, 1942, "Hair swept up in the Edwardian way, a high-necked blouse."),
    "hein": ("Piet Hein", 1905, 1996, "Bald on top with hair over the ears, and his pipe."),
    "carroll": ("Lewis Carroll", 1832, 1898, "Wavy hair over the ears, clean-shaven, a bow tie."),
    "kenko": ("Yoshida Kenkō", 1283, 1350, "A monk's shaven head and robe."),
    "rubik": ("Ernő Rubik", 1944, None, "Swept-back hair, heavy brows, a jacket."),
    "amundsen": ("Roald Amundsen", 1872, 1928, "Receding hair, heavy brows, a polar explorer's high collar."),
    "iwata": ("Satoru Iwata", 1959, 2015, "Side-parted hair, square glasses, a smile, suit and tie."),
    "potter": ("Beatrix Potter", 1866, 1943, "Hair drawn back into a bun, a high-necked blouse."),
    "jansson": ("Tove Jansson", 1914, 2001, "Short hair swept back from the face."),
    "teller": ("Teller", 1948, None, "Short dark hair, heavy brows, a silent closed mouth, suit and tie."),
    "eno": ("Brian Eno", 1948, None, "A bald dome, clean-shaven, an open collar."),
    "lovelace": ("Ada Lovelace", 1815, 1852, "Centre-parted hair falling in waves, a lace collar."),
    "berra": ("Yogi Berra", 1925, 2015, "Close-cropped hair, big ears, heavy brows and a grin."),
    "carson": ("Rachel Carson", 1907, 1964, "Short wavy hair, parted, a plain collar."),
    "basho": ("Matsuo Bashō", 1644, 1694, "A traveller's shaven head, eyes half closed, a robe."),
    "einstein": ("Albert Einstein", 1879, 1955, "Wild white hair, heavy brows and a bushy moustache."),
    "kahlo": ("Frida Kahlo", 1907, 1954, "Hair braided up into a crown, a loose blouse."),
    "ali": ("Muhammad Ali", 1942, 2016, "Close-cropped hair and a broad smile."),
    "brucelee": ("Bruce Lee", 1940, 1973, "Short swept hair, a steady gaze, a high collar."),
    "maryoliver": ("Mary Oliver", 1935, 2019, "Short hair with a straight fringe."),
    "hardy": ("G. H. Hardy", 1877, 1947, "Short parted hair, clean-shaven, a high collar."),
    "muir": ("John Muir", 1838, 1914, "Swept hair and a long, wild beard."),
    "fukuoka": ("Masanobu Fukuoka", 1913, 2008, "A bald head, a wispy moustache and beard."),
    "kimmerer": ("Robin Wall Kimmerer", 1953, None, "Long straight hair, parted."),
    "tagore": ("Rabindranath Tagore", 1861, 1941, "Long swept-back hair, heavy brows, a long flowing beard, a robe."),
    "okakura": ("Okakura Kakuzō", 1863, 1913, "Short hair, a moustache, a crossed robe."),
    "stark": ("Freya Stark", 1893, 1993, "A close-fitting hat low over the brow."),
    "jacobs": ("Jane Jacobs", 1916, 2006, "Short hair with a fringe and big round glasses."),
    "wilburwright": ("Wilbur Wright", 1867, 1912, "A bald dome, clean-shaven, a high starched collar."),
    "juliachild": ("Julia Child", 1912, 2004, "Short curled hair and a broad smile."),
    "ellington": ("Duke Ellington", 1899, 1974, "Hair slicked back, a pencil moustache, suit and tie."),
    "monk": ("Thelonious Monk", 1917, 1982, "Short hair, a goatee, suit and tie."),
    "chaplin": ("Charlie Chaplin", 1889, 1977, "Curly hair, a toothbrush moustache, a bow tie."),
    "cruyff": ("Johan Cruyff", 1947, 2016, "Long 1970s hair, centre-parted, an open collar."),
    "maathai": ("Wangari Maathai", 1940, 2011, "A headwrap and a wide smile."),
    "alankay": ("Alan Kay", 1940, None, "Short hair, round glasses and a moustache."),
    "eames": ("Charles Eames", 1907, 1978, "Short side-parted hair, a bow tie."),
    "cousteau": ("Jacques-Yves Cousteau", 1910, 1997, "A lean face under a close cap, a turtleneck."),
    "attenborough": ("David Attenborough", 1926, None, "Swept white hair, a smile, an open collar."),
    "berry": ("Wendell Berry", 1934, None, "Side-parted hair, heavy brows, a work shirt."),
    "leopold": ("Aldo Leopold", 1887, 1948, "Short parted hair, and a pipe."),
    "lafontaine": ("Jean de La Fontaine", 1621, 1695, "A great curled wig, a lace cravat."),
    "ryokan": ("Ryōkan", 1758, 1831, "A monk's shaven head, a gentle smile, a robe."),
    "blixen": ("Karen Blixen", 1885, 1962, "A turban wrapped close round the head."),
    "wittgenstein": ("Ludwig Wittgenstein", 1889, 1951, "Short curly hair, an intense gaze, an open collar."),
    "michaeljordan": ("Michael Jordan", 1963, None, "A shaved head and a broad smile."),
    "earhart": ("Amelia Earhart", 1897, 1937, "Short tousled curls, an open flying collar."),
    "markham": ("Beryl Markham", 1902, 1986, "Short fair hair, swept back."),
    "tarrasch": ("Siegbert Tarrasch", 1862, 1934, "Bald on top, pince-nez and a pointed beard."),
    "bourdain": ("Anthony Bourdain", 1956, 2018, "Swept grey hair, a lean face, an open collar."),
    "lange": ("Dorothea Lange", 1895, 1965, "Short hair with a fringe, a plain collar."),
    "goodall": ("Jane Goodall", 1934, 2025, "Hair drawn back in a ponytail, a plain shirt."),
    "kurosawa": ("Akira Kurosawa", 1910, 1998, "Swept-back hair, dark square glasses, an open collar."),
    "roberthoudin": ("Jean Eugène Robert-Houdin", 1805, 1871, "Swept-back curling hair, a high collar and cravat."),
    "tharp": ("Twyla Tharp", 1941, None, "Short hair cut close, a dancer's long neck."),
    "kahn": ("Louis Kahn", 1901, 1974, "Wisps of white hair, round glasses, a bow tie."),
    "cunningham": ("Imogen Cunningham", 1883, 1976, "Hair pinned up, round glasses."),
    "slocum": ("Joshua Slocum", 1844, 1909, "A bald dome, a full beard and moustache."),
    "annieduke": ("Annie Duke", 1965, None, "Long straight hair, parted."),
    "gretzky": ("Wayne Gretzky", 1961, None, "Feathered hair, a boyish face."),
    "billiejeanking": ("Billie Jean King", 1943, None, "Short hair with a fringe, square glasses."),
    "koster": ("Raph Koster", 1971, None, "Short hair, glasses and a beard."),
    "stravinsky": ("Igor Stravinsky", 1882, 1971, "Bald, round glasses, a small moustache."),
    "silverstein": ("Shel Silverstein", 1930, 1999, "A shaved head and a full beard."),
    "sacks": ("Oliver Sacks", 1933, 2015, "Bald on top, glasses and a white beard."),
    "huizinga": ("Johan Huizinga", 1872, 1945, "Slicked-back hair, round glasses, a high collar."),
    "grandin": ("Temple Grandin", 1947, None, "Short curly hair, a western shirt."),
    "andersen": ("Hans Christian Andersen", 1805, 1875, "Wavy hair swept back, a long face, a high collar and cravat."),
    "sidmeier": ("Sid Meier", 1954, None, "Short side-parted hair, glasses."),
    "issa": ("Kobayashi Issa", 1763, 1828, "A shaven head, a smile, a robe."),
    "mingus": ("Charles Mingus", 1922, 1979, "Short hair, a moustache and a goatee."),
    "graham": ("Martha Graham", 1894, 1991, "Hair drawn severely back, a dark robe."),
    "fonteyn": ("Margot Fonteyn", 1919, 1991, "Dark hair in a ballerina's bun, a long neck."),
    "osler": ("William Osler", 1849, 1919, "Receding hair and a drooping moustache, a high collar."),
    "mallory": ("George Mallory", 1886, 1924, "Centre-parted hair, a climber's open collar."),
    "shackleton": ("Ernest Shackleton", 1874, 1922, "Centre-parted hair, a strong jaw, a heavy sweater."),
    "coritakent": ("Corita Kent", 1918, 1986, "Short hair with a fringe, round glasses."),
    "bobross": ("Bob Ross", 1942, 1995, "A great round perm and a curly beard, an open shirt."),
    "sendak": ("Maurice Sendak", 1928, 2012, "Bald on top, glasses and a beard."),
    "sallyride": ("Sally Ride", 1951, 2012, "A short bob, parted, a flight-suit collar."),
    "jemison": ("Mae Jemison", 1956, None, "Short natural hair, a warm smile."),
    "shepherd": ("Nan Shepherd", 1893, 1981, "Hair falling to the jaw under a headband."),
    "seuss": ("Dr. Seuss", 1904, 1991, "Swept hair, a neat beard, a bow tie."),
    "juster": ("Norton Juster", 1929, 2021, "Short swept hair and a moustache."),
    "dahl": ("Roald Dahl", 1916, 1990, "Receding hair, a long face, a cardigan."),
    "ebwhite": ("E. B. White", 1899, 1985, "Side-parted hair and a trim moustache, a tie."),
    "schulz": ("Charles M. Schulz", 1922, 2000, "Short combed hair, a gentle smile, a sweater."),
    "watterson": ("Bill Watterson", 1958, None, "Short hair and a moustache."),
    "cohen": ("Leonard Cohen", 1934, 2016, "Short grey hair, heavy-lidded eyes, suit and tie."),
    "barrie": ("J. M. Barrie", 1860, 1937, "Side-parted hair, a moustache, a high collar."),
    "hippocrates": ("Hippocrates", -460, -370, "A bald dome and a curly beard (the Ostia bust)."),
    "mirzakhani": ("Maryam Mirzakhani", 1977, 2017, "Short hair close to the head, a warm smile."),
    "polya": ("George Pólya", 1887, 1985, "Receding white hair, round glasses, suit and tie."),
    "poincare": ("Henri Poincaré", 1854, 1912, "Short hair, pince-nez, a short pointed beard."),
    "earle": ("Sylvia Earle", 1935, None, "Short silver hair swept back."),
    "gardner": ("Martin Gardner", 1914, 2010, "Short combed hair, glasses, a cardigan."),
}

# Authors whose years are only known roughly; shown as "c. ...".
CIRCA = {"dhammapada", "zhuangzi", "seneca", "epictetus", "douglass", "suntzu", "kenko", "hippocrates"}


def simplify(points, tolerance=0.5):
    if len(points) < 3:
        return points
    (ax, ay), (bx, by) = points[0], points[-1]
    length = math.hypot(bx - ax, by - ay)
    worst, index = 0.0, 0
    for i, (px, py) in enumerate(points[1:-1], 1):
        if length:
            d = abs((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / length
        else:
            d = math.hypot(px - ax, py - ay)
        if d > worst:
            worst, index = d, i
    if worst <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[: index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)


def main():
    lines = [
        "// Generated by scripts/portraits/export.py - do not edit. To add an",
        "// author or change a portrait, see docs/quotes.md.",
        "",
        "export type QuoteAuthor = {",
        "  /** As written in QuotesText.ts. */",
        "  name: string;",
        "  /** Year of birth, roughly (negative is BC); authors are in this order. */",
        "  born: number;",
        "  /** Year of death, or null while living. */",
        "  died: number | null;",
        "  /** Whether the years are only known roughly. */",
        "  circa: boolean;",
        "  /**",
        '   * One unbroken line in the "one-line drawing" style: face on, in a',
        "   * 200 x 240 box, from the bottom left to the bottom right.",
        "   */",
        "  portrait: string;",
        "};",
        "",
        "export const QUOTE_AUTHORS: QuoteAuthor[] = [",
    ]
    entries = sorted(AUTHORS.items(), key=lambda item: item[1][1])
    for module, (name, born, died, note) in entries:
        points = simplify(importlib.import_module(module).draw())
        d = "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in points)
        lines += [
            f"  // {note}",
            "  {",
            f'    name: "{name}",',
            f"    born: {born},",
            f"    died: {'null' if died is None else died},",
            f"    circa: {'true' if module in CIRCA else 'false'},",
            f'    portrait: "{d}",',
            "  },",
        ]
    lines.append("];")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Wrote {os.path.relpath(OUT)} ({len(entries)} authors)")


if __name__ == "__main__":
    main()
