/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const { Contract } = require("fabric-contract-api");
const crypto = require("crypto");

class Chaincode extends Contract {
  // Create new certificate
  async CreateCertificate(
    ctx,
    studentName,
    dni,
    program,
    issueDate,
    degree,
    title,
    institution
  ) {
    const data = `${studentName}|${dni}|${program}|${issueDate}|${degree}|${title}|${institution}`;
    const idCertificate = crypto
      .createHash("sha256")
      .update(data)
      .digest("hex");

    const certificate = {
      id: idCertificate,
      studentName,
      dniStudent: dni,
      program,
      issueDate,
      degree,
      title,
      institution,
    };
    console.log(idCertificate);

    const exists = await this.CertificateExists(ctx, idCertificate);
    if (exists) {
      throw new Error("The certificate already exists");
    }

    // const certificate = {
    //   id: idCertificate,
    //   studentName,
    //   dniStudent: dni,
    //   program,
    //   issueDate,
    //   degree,
    //   title,
    //   institution,
    // };

    await ctx.stub.putState(
      idCertificate,
      Buffer.from(JSON.stringify(certificate))
    );

    return certificate;
  }

  // Certificate exists
  async CertificateExists(ctx, certificateId) {
    let certificate = await ctx.stub.getState(certificateId);
    console.log(certificate.length);

    return certificate && certificate.length > 0;
  }

  // InitLedger
  async InitLedger(ctx) {
    const certificates = [
      {
        studentName: "Juani",
        dniStudent: "43474542",
        program: "Programa 1",
        issueDate: "2024-12-01",
        degree: "Ingenieria",
        title: "Ingenieria en sistemas",
        institution: "Universidad Tecnologica Nacional",
      },
      {
        studentName: "Juan",
        dniStudent: "43884165",
        program: "Programa 2",
        issueDate: "2024-12-25",
        degree: "Ingenieria",
        title: "Ingenieria en sistemas",
        institution: "Universidad Tecnologica Nacional",
      },
    ];

    for (const certificate of certificates) {
      await this.CreateCertificate(
        ctx,
        certificate.studentName,
        certificate.dniStudent,
        certificate.program,
        certificate.issueDate,
        certificate.degree,
        certificate.title,
        certificate.institution
      );
    }
  }
}

module.exports = Chaincode;
