/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const { Contract } = require("fabric-contract-api");
const crypto = require("crypto");

class Chaincode extends Contract {
  // Create new student
  async CreateUser(ctx, userDni, userType) {
    const enrollmentID =
      ctx.clientIdentity.getAttributeValue("hf.EnrollmentID");

    if (enrollmentID !== "org1admin")
      throw new Error(
        "You don't have the necessary permissions to create a user"
      );

    const idUser = crypto.createHash("sha256").update(userDni).digest("hex");
    const userData = {
      id: idUser,
      userType: userType,
      dni: userDni,
    };

    try {
      await ctx.stub.putState(idUser, Buffer.from(JSON.stringify(userData)));
    } catch (error) {
      throw new Error("Something went wrong");
    }

    return {
      message: "User created successfully",
      user: userData,
    };
  }

  // Validate user type
  async ValidateUserType(ctx, userDni) {
    const idUser = crypto.createHash("sha256").update(userDni).digest("hex");

    const userData = await ctx.stub.getState(idUser);

    if (!userData || userData.length === 0)
      throw new Error("User does not exist");

    const jsonUserData = JSON.parse(userData.toString("utf8"));

    return jsonUserData;
  }

  // Create new certificate
  async CreateCertificate(
    ctx,
    studentName,
    dni,
    program,
    issueDate,
    degree,
    title,
    institution,
    requestUserDni
  ) {
    const userData = await this.ValidateUserType(ctx, requestUserDni);

    if (userData.userType !== "institution")
      throw new Error("You don't have the necessary permissions");

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

    const exists = await this.EntityExists(ctx, idCertificate);
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

  // Entity exists
  async EntityExists(ctx, entityId) {
    const entity = await ctx.stub.getState(entityId);

    if (entity && entity.length > 0) return true;
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

    return certificateJson;
  }

  // Revoke certificate
  async RevokeCertificate(ctx, certificateId, reason, requestUserDni) {
    const userData = await this.ValidateUserType(ctx, requestUserDni);

    if (userData.userType !== "institution")
      throw new Error("You don't have the necessary permissions");

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
  async GetStudentCertificates(ctx, dni, requestUserDni) {
    const userData = await this.ValidateUserType(ctx, requestUserDni);

    if (userData.userType === "student") {
      if (userData.dni !== dni) throw new Error("You don't have permissions");
    }

    if (!dni) throw new Error("Provide the dni of the student");

    const query = {
      selector: {
        dniStudent: dni,
        state: "issued",
      },
    };

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

  // Create verification request
  async CreateVerificationRequest(
    ctx,
    certificateId,
    employeeName,
    requestDate,
    requestUserDni
  ) {
    const userData = await this.ValidateUserType(ctx, requestUserDni);

    if (userData.userType !== "institution")
      throw new Error("You don't have the necessary permissions");

    if (!certificateId) throw new Error("The certificate id is required");
    if (!employeeName) throw new Error("The employee name is required");
    if (!requestDate) throw new Error("The request date is required");

    const regexRequestDate = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!regexRequestDate.test(requestDate))
      throw new Error("The issue date must be like YYYY-MM-DD");

    const requestDateWithDateFormat = new Date(requestDate);
    const currentDate = new Date();

    requestDateWithDateFormat.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    if (requestDateWithDateFormat >= currentDate)
      throw new Error("The issue date must be previous than today");

    const data = `${certificateId}|${employeeName}|${requestDate}`;
    const idVerificationRequest = crypto
      .createHash("sha256")
      .update(data)
      .digest("hex");

    const verificationRequestData = {
      id: idVerificationRequest,
      certificateId,
      employeeName,
      requestDate,
      result: "pending",
      comments: "",
    };

    const exists = await this.EntityExists(ctx, idVerificationRequest);
    if (exists) throw new Error("The verification request already exists");

    try {
      await this.ValidateCertificate(ctx, certificateId);

      verificationRequestData.result = "valid";
    } catch (error) {
      verificationRequestData.result = "invalid";
    }

    try {
      await ctx.stub.putState(
        idVerificationRequest,
        Buffer.from(JSON.stringify(verificationRequestData))
      );
    } catch (error) {
      throw new Error("Something went wrong");
    }

    return verificationRequestData;
  }

  // Init ledger
  async InitLedger(ctx) {
    const usersDefault = [
      {
        userDni: "42854190",
        userType: "institution",
      },
      {
        userDni: "43884165",
        userType: "student",
      },
    ];

    for (const user of usersDefault) {
      await this.CreateUser(ctx, user.userDni, user.userType);
    }
  }
}

module.exports = Chaincode;
