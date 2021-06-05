use corewa_rs::vm::VirtualMachine;

fn fight_cycles(players: &[(i32, Vec<u8>)]) -> u32 {
    let mut vm = VirtualMachine::new();
    vm.load_players(players);

    while !vm.processes.is_empty() {
        vm.tick();
    }

    vm.cycles
}

macro_rules! test_single {
    ($champ:ident, $cycles:expr) => {
        #[test]
        fn $champ() {
            assert_eq!(fight_cycles(&[(1, sample!($champ).to_vec())]), $cycles)
        }
    };
}

test_single!(zork, 57_955);
test_single!(bigzork, 28_363);
test_single!(mise_a_jour_windows95, 27_439);
test_single!(kappa, 25_903);

#[test]
fn four_players() {
    let players = [
        (1, sample!(kappa).to_vec()),
        (2, sample!(thunder).to_vec()),
        (3, sample!(sweepmaster).to_vec()),
        (4, sample!(skynet).to_vec()),
    ];
    assert_eq!(fight_cycles(&players), 24367)
}
