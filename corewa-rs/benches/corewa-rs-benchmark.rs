use criterion::{criterion_group, criterion_main, Criterion};

use corewa_rs::vm::VirtualMachine;

fn fight_cycles(players: &[(i32, Vec<u8>)]) -> u32 {
    let mut vm = VirtualMachine::new();
    vm.load_players(players);

    while !vm.processes.is_empty() {
        vm.tick();
    }

    vm.cycles
}

fn fast_fight(c: &mut Criterion) {
    c.bench_function("zork alone", |b| {
        b.iter(|| fight_cycles(&[(1, include_bytes!("../../champs/examples/zork.cor").to_vec())]))
    });
}

fn fun_fight(c: &mut Criterion) {
    c.bench_function("sweepmaster + kappa", |b| {
        b.iter(|| {
            fight_cycles(&[
                (
                    1,
                    include_bytes!("../tests/vm/samples/sweepmaster.cor").to_vec(),
                ),
                (2, include_bytes!("../tests/vm/samples/kappa.cor").to_vec()),
            ])
        })
    });
}

fn slow_fight(c: &mut Criterion) {
    c.bench_function("maj_windows alone", |b| {
        b.iter(|| {
            fight_cycles(&[(
                1,
                include_bytes!("../tests/vm/samples/mise_a_jour_windows95.cor").to_vec(),
            )])
        })
    });
}

fn best_fight(c: &mut Criterion) {
    c.bench_function("best fight", |b| {
        b.iter(|| {
            fight_cycles(&[
                (
                    -1583259151,
                    include_bytes!("../tests/vm/samples/sweepmaster.cor").to_vec(),
                ),
                (
                    -1203621482,
                    include_bytes!("../tests/vm/samples/kappa.cor").to_vec(),
                ),
                (
                    -842760991,
                    include_bytes!("../tests/vm/samples/helltrain.cor").to_vec(),
                ),
                (
                    1257806384,
                    include_bytes!("../tests/vm/samples/justin_bee.cor").to_vec(),
                ),
            ])
        })
    });
}

criterion_group!(benches, fast_fight);
criterion_group! {
    name = slower_benches;
    config = Criterion::default().sample_size(10);
    targets = best_fight, fun_fight, slow_fight
}
criterion_main!(benches, slower_benches);
