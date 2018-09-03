extern crate corewar;

fn main() {
    let champion = corewar::read_champion(std::io::stdin())
        .expect("Failed to read champion");

    corewar::dump_champion(&champion);
}
