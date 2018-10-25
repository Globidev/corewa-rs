pub struct WrappingArray<T>(Box<[T]>);

impl<T: Default + Clone> WrappingArray<T> {
    pub fn with_size(size: usize) -> Self {
        Self {
            0: std::iter::repeat_with(Default::default)
                .take(size)
                .collect::<Vec<_>>()
                .into_boxed_slice()
        }
    }

    pub fn repeat(size: usize, t: T) -> Self {
        Self {
            0: std::iter::repeat(t)
                .take(size)
                .collect::<Vec<_>>()
                .into_boxed_slice()
        }
    }

    pub fn as_ptr(&self) -> *const T {
        self.0.as_ptr()
    }
}

use std::ops::{Index, IndexMut};

impl<T> Index<usize> for WrappingArray<T> {
    type Output = T;

    fn index(&self, index: usize) -> &T {
        self.0.index(index % self.0.len())
    }
}

impl<T> IndexMut<usize> for WrappingArray<T> {
    fn index_mut(&mut self, index: usize) -> &mut T {
        self.0.index_mut(index % self.0.len())
    }
}


#[cfg(test)]
mod test {
    use super::WrappingArray;

    fn usize_indexing_wraps_correctly(size: usize) {
        let mut array = WrappingArray::with_size(size);

        for idx in 0..size { array[idx] = idx }

        for offset in 0..256 {
            for idx in 0..size {
                assert_eq!(array[offset * size + idx], idx)
            }
        }
    }

    #[test]
    fn usize_indexing_wraps_correctly_for_many_sizes() {
        for size in 0..256 {
            usize_indexing_wraps_correctly(size)
        }
    }
}
