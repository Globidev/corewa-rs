macro_rules! sample {
    ($name:ident) => {
        &include_bytes!(concat!("samples/", stringify!($name), ".cor"))[..]
    };
}

mod fights;
