extern crate corewar;

fn main() {
    // let input = std::fs::File::open(std::env::args().nth(1).expect("missing file"))
    //     .expect("Failed to open file");
    println!("{:?}", corewar::read_champion(std::io::stdin()));
}
