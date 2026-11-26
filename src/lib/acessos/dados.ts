// CPF e celular do cadastro: guardados só com os números. Sem código de
// servidor, para as telas do navegador também usarem.

export const soDigitos = (v: string) => v.replace(/\D/g, "");

/** CPF com os dois dígitos verificadores certos. */
export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

/** DDD + número: 10 dígitos (fixo) ou 11 (celular, começa com 9 depois do DDD). */
export const celularValido = (cel: string) => /^[1-9]\d(9\d{8}|[2-8]\d{7})$/.test(cel);

export const mostrarCpf = (cpf: string) => cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");

export const mostrarCelular = (cel: string) =>
  cel.length === 11 ? cel.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3") : cel.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
