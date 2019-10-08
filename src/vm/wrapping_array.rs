
pub struct WrappingArray<T>(Box<[T]>);

impl<T> WrappingArray<T> {
    pub fn as_ptr(&self) -> *const T {
        self.0.as_ptr()
    }

    pub fn iter_mut(&mut self) -> impl Iterator<Item = &mut T> {
        self.0.iter_mut()
    }
}

impl<T> std::iter::FromIterator<T> for WrappingArray<T> {
    fn from_iter<It: IntoIterator<Item = T>>(iter: It) -> Self {
        Self(Vec::from_iter(iter).into_boxed_slice())
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
        let array = (0..size).collect::<WrappingArray<_>>();

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
