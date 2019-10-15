pub trait Parser<I>: Sized {
    type Output;
    type Err;

    fn parse(&mut self, input: &mut I) -> Result<Self::Output, Self::Err>;

    fn map<F>(self, f: F) -> Map<Self, F> {
        Map(self, f)
    }
    fn map_err<F>(self, f: F) -> MapErr<Self, F> {
        MapErr(self, f)
    }
    fn or<C>(self, other: C) -> Or<Self, C> {
        Or(self, other)
    }
    fn many(self) -> Many<Self> {
        Many(self)
    }
}

pub struct Map<P, F>(P, F);
pub struct MapErr<P, F>(P, F);
pub struct Or<P1, P2>(P1, P2);
pub struct Many<P>(P);

impl<I, E, T, U, P, F> Parser<I> for Map<P, F>
where
    P: Parser<I, Output = T, Err = E>,
    F: FnMut(T) -> U,
{
    type Output = U;
    type Err = E;

    fn parse(&mut self, input: &mut I) -> Result<Self::Output, Self::Err> {
        let Self(parser, transform) = self;

        parser.parse(input).map(transform)
    }
}

impl<I, E, T, G, P, F> Parser<I> for MapErr<P, F>
where
    P: Parser<I, Output = T, Err = E>,
    F: FnMut(E) -> G,
{
    type Output = T;
    type Err = G;

    fn parse(&mut self, input: &mut I) -> Result<Self::Output, Self::Err> {
        let Self(parser, on_err) = self;

        parser.parse(input).map_err(on_err)
    }
}

impl<I, E1, E2, T, P1, P2> Parser<I> for Or<P1, P2>
where
    P1: Parser<I, Output = T, Err = E1>,
    P2: Parser<I, Output = T, Err = E2>,
    I: Clone,
{
    type Output = T;
    type Err = (E1, E2);

    fn parse(&mut self, input: &mut I) -> Result<Self::Output, Self::Err> {
        let Self(p1, p2) = self;
        let saved = input.clone();

        p1.parse(input).or_else(|e1| {
            *input = saved;
            p2.parse(input).map_err(|e2| (e1, e2))
        })
    }
}

impl<I, E, T, P> Parser<I> for Many<P>
where
    P: Parser<I, Output = T, Err = E> + Clone,
    I: Clone,
{
    type Output = Vec<T>;
    type Err = E;

    fn parse(&mut self, input: &mut I) -> Result<Self::Output, Self::Err> {
        let mut out = Vec::new();

        loop {
            let saved = input.clone();
            match self.0.parse(input) {
                Ok(x) => out.push(x),
                Err(_) => {
                    *input = saved;
                    break
                }
            }
        }

        Ok(out)
    }
}

impl<I, T, E, F> Parser<I> for F
where
    F: FnMut(&mut I) -> Result<T, E>,
{
    type Output = T;
    type Err = E;

    fn parse(&mut self, input: &mut I) -> Result<Self::Output, Self::Err> {
        self(input)
    }
}
