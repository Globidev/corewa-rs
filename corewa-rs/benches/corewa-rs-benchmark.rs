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

fn fast_fights(c: &mut Criterion) {
    c.bench_function("zork alone", |b| {
        b.iter(|| fight_cycles(&[(1, include_bytes!("../../champs/examples/zork.cor").to_vec())]))
    });
}

fn slow_fights(c: &mut Criterion) {
    c.bench_function("maj_windows alone", |b| {
        b.iter(|| {
            fight_cycles(&[(
                1,
                include_bytes!("../tests/vm/samples/mise_a_jour_windows95.cor").to_vec(),
            )])
        })
    });
}

criterion_group!(benches, fast_fights);
criterion_group! {
    name = slower_benches;
    config = Criterion::default().sample_size(10);
    targets = slow_fights
}
criterion_main!(benches, slower_benches);
