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
    if (!studentName) throw new Error("The student name is required");
    if (!dni) throw new Error("The dni is required");
    if (!program) throw new Error("The program is required");
    if (!issueDate) throw new Error("The issue date is required");
    if (!degree) throw new Error("The degree is required");
    if (!title) throw new Error("The title is required");
    if (!institution) throw new Error("The institution is required");

    const regexIssueDate = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!regexIssueDate.test(issueDate))
      throw new Error("The issue date must be like YYYY-MM-DD");

    const issueDateWithDateFormat = new Date(issueDate);
    const currentDate = new Date();

    issueDateWithDateFormat.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    if (issueDateWithDateFormat >= currentDate)
      throw new Error("The issue date must be previous than today");

    const data = `${studentName}|${dni}|${program}|${issueDate}|${degree}|${title}|${institution}`;
    const idCertificate = crypto
      .createHash("sha256")
      .update(data)
      .digest("hex");

    const exists = await this.CertificateExists(ctx, idCertificate);
    if (exists) throw new Error("The certificate already exists");

    const certificate = {
      id: idCertificate,
      studentName,
      dniStudent: dni,
      program,
      issueDate,
      degree,
      title,
      institution,
      state: "issued",
      revocationReason: "",
    };

    try {
      await ctx.stub.putState(
        idCertificate,
        Buffer.from(JSON.stringify(certificate))
      );
    } catch (error) {
      throw new Error("Something went wrong");
    }

    return certificate;
  }

  // Certificate exists
  async CertificateExists(ctx, certificateId) {
    const certificate = await ctx.stub.getState(certificateId);

    if (certificate && certificate.length > 0) return true;
    else return false;
  }

  // Validate certificate
  async ValidateCertificate(ctx, certificateId) {
    const certificate = await ctx.stub.getState(certificateId);

    if (!certificate || certificate.length === 0)
      throw new Error(`Certificate ${certificateId} does not exist`);

    const certificateJson = JSON.parse(certificate.toString("utf8"));

    if (certificateJson.state === "revoked")
      throw new Error(`The certificate ${certificateId} is revoked`);

    // TODO: VERIFICAR COMO PODER SABER SI EL CERTIIFICADO HA SIDO MODIFICADO
    return certificateJson;
  }

  // Revoke certificate
  async RevokeCertificate(ctx, certificateId, reason) {
    if (!reason) throw new Error("The reason of revoke is required");

    const certificateData = await this.ValidateCertificate(ctx, certificateId);

    certificateData.state = "revoked";
    certificateData.revocationReason = reason;

    try {
      await ctx.stub.putState(
        certificateId,
        Buffer.from(JSON.stringify(certificateData))
      );
    } catch (error) {
      throw new Error("Something went wrong");
    }

    return certificateData;
  }

  // Get all certificates of student
  async GetStudentCertificates(ctx, dni) {
    if (!dni) throw new Error("Provide the dni of the student");

    const query = {
      selector: {
        dniStudent: dni,
        state: "issued",
      },
    };

    const clientID = ctx.clientIdentity.getID();

    console.log(`Certificate creation invoked by (ID: ${clientID})`);

    const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
    const results = [];

    let result = await iterator.next();
    while (!result.done) {
      const certificate = JSON.parse(result.value.value.toString("utf8"));
      results.push(certificate);
      result = await iterator.next();
    }
    await iterator.close();

    if (results.length === 0)
      throw new Error("The student is not registered in the smart contract");

    return results;
  }

  // Init ledger
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
