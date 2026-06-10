const values = [1, 2, 3];
let total = 0;

for (let index = 0; index < values.length; index += 1) {
  total += values[index];
}

export const generated = missingMapGlobal.repeat(total);
