export const WORKER_REGISTRATION_RULES = Object.freeze({
  CL: Object.freeze({ minimumWorkerAge: 18 }),
});

export function minimumWorkerAgeFor(country = 'CL') {
  return WORKER_REGISTRATION_RULES[country]?.minimumWorkerAge
    ?? WORKER_REGISTRATION_RULES.CL.minimumWorkerAge;
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day);
}

export function validateWorkerBirthDate(value, {
  minimumWorkerAge = minimumWorkerAgeFor(),
  today = localIsoDate(),
} = {}) {
  if (!value) return { valid: true };
  const birthDate = String(value);
  if (!isCalendarDate(birthDate)) {
    return { valid: false, code: 'INVALID_WORKER_BIRTH_DATE', message: 'La fecha de nacimiento no es válida.' };
  }
  if (birthDate > today) {
    return { valid: false, code: 'INVALID_WORKER_BIRTH_DATE', message: 'La fecha de nacimiento no puede ser posterior a hoy.' };
  }

  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number);
  const [currentYear, currentMonth, currentDay] = today.split('-').map(Number);
  let age = currentYear - birthYear;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) age -= 1;
  if (age < minimumWorkerAge) {
    return {
      valid: false,
      code: 'WORKER_UNDERAGE',
      message: `La persona es menor de edad. Debe tener al menos ${minimumWorkerAge} años para ser registrada.`,
      minimumWorkerAge,
    };
  }
  return { valid: true, minimumWorkerAge };
}
