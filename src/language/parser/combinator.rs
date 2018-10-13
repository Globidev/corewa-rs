pub trait Parser<I>: Sized {
    type Output;
    type Err;

    fn parse(self, input: &mut I) -> Result<Self::Output, Self::Err>;

    fn map<F>(self, f: F) -> Map<Self, F> {
        Map(self, f)
    }
    fn map_err<F>(self, f: F) -> MapErr<Self, F> {
        MapErr(self, f)
    }
    fn or<C>(self, other: C) -> Or<Self, C> {
        Or(self, other)
    }
    fn and<C>(self, other: C) -> And<Self, C> {
        And(self, other)
    }
    fn optional(self) -> Optional<Self> {
        Optional(self)
    }
}

pub struct Map<P, F>(P, F);
pub struct MapErr<P, F>(P, F);
pub struct Or<P1, P2>(P1, P2);
pub struct And<P1, P2>(P1, P2);
pub struct Optional<P>(P);

impl<I, E, T, U, P, F> Parser<I> for Map<P, F>
where
    P: Parser<I, Output = T, Err = E>,
    F: FnOnce(T) -> U,
{
    type Output = U;
    type Err = E;

    fn parse(self, input: &mut I) -> Result<Self::Output, Self::Err> {
        self.0.parse(input).map(self.1)
    }
}

impl<I, E, T, G, P, F> Parser<I> for MapErr<P, F>
where
    P: Parser<I, Output = T, Err = E>,
    F: FnOnce(E) -> G,
{
    type Output = T;
    type Err = G;

    fn parse(self, input: &mut I) -> Result<Self::Output, Self::Err> {
        self.0.parse(input).map_err(self.1)
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

    fn parse(self, input: &mut I) -> Result<Self::Output, Self::Err> {
        let (p1, p2) = (self.0, self.1);
        let saved = input.clone();

        p1.parse(input).or_else(|e1| {
            std::mem::replace(input, saved);
            p2.parse(input).map_err(|e2| (e1, e2))
        })
    }
}

impl<I, E, T1, T2, P1, P2> Parser<I> for And<P1, P2>
where
    P1: Parser<I, Output = T1, Err = E>,
    P2: Parser<I, Output = T2, Err = E>,
{
    type Output = (T1, T2);
    type Err = E;

    fn parse(self, input: &mut I) -> Result<Self::Output, Self::Err> {
        let r1 = self.0.parse(input)?;
        let r2 = self.1.parse(input)?;
        Ok((r1, r2))
    }
}

impl<I, E, T, P> Parser<I> for Optional<P>
where
    P: Parser<I, Output = T, Err = E>,
    I: Clone,
{
    type Output = Option<T>;
    type Err = E;

    fn parse(self, input: &mut I) -> Result<Self::Output, Self::Err> {
        let saved = input.clone();

        self.0.parse(input).map(Some).or_else(|_| {
            std::mem::replace(input, saved);
            Ok(None)
        })
    }
}

impl<I, T, E, F> Parser<I> for F
where
    F: FnOnce(&mut I) -> Result<T, E>,
{
    type Output = T;
    type Err = E;

    fn parse(self, input: &mut I) -> Result<Self::Output, Self::Err> {
        self(input)
    }
}
