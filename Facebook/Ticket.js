class Ticket {
  constructor(idFacebook, name, lastName, idCredicoop, reason) {
    this.idFacebook = idFacebook;
    this.name = name;
    if (lastName) {
      this.lastName = apellido;
    } else {
      this.lastName = "";
    }
    this.idCredicoop = idCredicoop;
    if (reason) {
      this.reason = reason;
    } else {
      this.reason = "";
    }
  }
  setReason(reason) {
    if (reason) this.reason = reason;
  }
}

module.exports = Ticket;
