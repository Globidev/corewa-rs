extern crate corewar;

fn main() {
    let champion = corewar::language::read_champion(std::io::stdin())
        .expect("Failed to read champion");

    corewar::language::write_champion(std::io::stdout(), &champion)
        .expect("Failed to write champion");
}
