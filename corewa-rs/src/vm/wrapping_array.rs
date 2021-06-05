#[derive(derive_more::From)]
pub struct WrappingArray<T, const LEN: usize>([T; LEN]);

impl<T, const LEN: usize> WrappingArray<T, LEN> {
    pub fn as_ptr(&self) -> *const T {
        self.0.as_ptr()
    }

    pub fn inner(&self) -> &[T; LEN] {
        &self.0
    }

    pub fn inner_mut(&mut self) -> &mut [T; LEN] {
        &mut self.0
    }
}

impl<T, const LEN: usize> std::ops::Index<usize> for WrappingArray<T, LEN> {
    type Output = T;

    fn index(&self, index: usize) -> &T {
        self.0.index(index % LEN)
    }
}

impl<T, const LEN: usize> std::ops::IndexMut<usize> for WrappingArray<T, LEN> {
    fn index_mut(&mut self, index: usize) -> &mut T {
        self.0.index_mut(index % LEN)
    }
}

#[cfg(test)]
mod test {
    use super::WrappingArray;

    fn usize_indexing_wraps_correctly<const N: usize>() {
        let array: WrappingArray<_, N> = {
            let mut array = [0; N];
            (0..N).for_each(|x| array[x] = x);
            array.into()
        };

        for offset in 0..256 {
            for idx in 0..N {
                assert_eq!(array[offset * N + idx], idx)
            }
        }
    }

    #[test]
    fn usize_indexing_wraps_correctly_for_many_sizes() {
        usize_indexing_wraps_correctly::<0>();
        usize_indexing_wraps_correctly::<10>();
        usize_indexing_wraps_correctly::<20>();
        usize_indexing_wraps_correctly::<32>();
        usize_indexing_wraps_correctly::<64>();
        usize_indexing_wraps_correctly::<128>();
        usize_indexing_wraps_correctly::<256>();
        usize_indexing_wraps_correctly::<4096>();
    }
}
